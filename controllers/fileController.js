import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { decrypt, encryptBuffer } from '../utilities/encryption.js';
import File from '../models/file.js';
import Directory from '../models/directory.js';

// ===== path setup =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== load legal mime list safely =====
const legalMime = fs
  .readFileSync(path.join(__dirname, '../config/legalMime.txt'), 'utf8')
  .split(/\r?\n/)
  .map(m => m.trim())
  .filter(Boolean);

// ===== config =====
const maxFiles = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ===== memory storage (encrypt before disk write) =====
const storage = multer.memoryStorage();

// ===== file filter =====
const fileFilter = (req, file, cb) => {
  if (legalMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only certain files are allowed.'), false);
  }
};

const uploader = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// ===== middleware runner =====
const runMiddleware = (req, res, fn) =>
  new Promise((resolve, reject) => {
    fn(req, res, err => (err ? reject(err) : resolve()));
  });

// ===== ensure base uploads dir =====
const baseUploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

// ===== SAVE ENCRYPTED FILE =====
const saveEncryptedFile = async (req, file, relativePath = '') => {
  // decrypt user master key
  const secretKey = decrypt(req.user.secretKey, req.session.kek);

  // sanitize filename
  const safeName = path.basename(file.originalname).replace(/[^\w.\-]/g, '_');

  // per-user directory on disk
  const userDir = path.join(baseUploadDir, req.user._id.toString());
  fs.mkdirSync(userDir, { recursive: true });

  // encrypt buffer
  const { encryptedData, iv, authTag } = encryptBuffer(file.buffer, secretKey);

  // generate final filename
  const finalName = `${Date.now()}-${safeName}.enc`;
  const fullPath = path.join(userDir, finalName);

  // write encrypted file to disk
  fs.writeFileSync(fullPath, encryptedData);

  // === DATABASE DIRECTORY ===
  // Ensure user root directory exists
  let rootDir = await Directory.findOne({ account: req.user._id, parent: null });
  if (!rootDir) {
    rootDir = new Directory({ account: req.user._id, name: 'root', parent: null });
    await rootDir.save();
  }

  // Use recursiveCreation to build nested directories (if relativePath is provided)
  const targetDir = relativePath
    ? await rootDir.recursiveCreation(req.user, relativePath)
    : rootDir;

  // === SAVE FILE TO DATABASE ===
  const fileObj = new File({
    account: req.user._id,
    directory: targetDir._id,
    name: file.originalname,
    storedAs: finalName,
    mime: file.mimetype,
    size: file.size,
    iv,
    authTag
  });
  await fileObj.save();

  return {
    storedAs: finalName,
    original: file.originalname,
    directory: targetDir.name
  };
};

// ===== CONTROLLERS =====
const view = async (req, res) => {
  res.render('fileRepository');
};

// ===== SINGLE UPLOAD =====
const upload = async (req, res) => {
  try {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ redirect: '/auth/login' });
    }

    await runMiddleware(req, res, uploader.single('file'));

    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const result = await saveEncryptedFile(req, req.file, 'Projects/EncryptedFiles');

    res.status(200).json({
      message: 'File uploaded & encrypted',
      file: result
    });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    console.error('Upload Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== MULTI UPLOAD =====
const uploadMany = async (req, res) => {
  try {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ redirect: '/auth/login' });
    }

    await runMiddleware(req, res, uploader.array('file[]', maxFiles));

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    const results = [];
    for (const file of req.files) {
        const r = await saveEncryptedFile(req, file, 'Projects/EncryptedFiles');
        results.push(r);
    }

    res.status(200).json({
      message: 'Files uploaded & encrypted',
      files: results
    });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    console.error('Upload Error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  view,
  upload,
  uploadMany
};