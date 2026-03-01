import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { decrypt, encryptBuffer } from '../utilities/encryption.js';
import File from '../models/file.js';
import Directory from '../models/directory.js';
import { v7 } from 'uuid';

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
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, err => (err ? reject(err) : resolve()));
  });
};

// ===== ensure base uploads dir =====
const baseUploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

// ===== SAVE ENCRYPTED FILE =====
import { randomBytes } from 'crypto';

// ===== BULK SAVE ENCRYPTED FILES =====
const encryptFiles = async (req, files, relativePath = '') => {
  // Decrypt user KEK once
  const secretKey = decrypt(req.user.secretKey, req.session.kek);

  // Ensure user directory
  const userDir = path.join(baseUploadDir, req.user._id.toString());
  fs.mkdirSync(userDir, { recursive: true });

  // Ensure root directory in DB
  let rootDir = await Directory.findOne({ account: req.user._id, parent: null });
  if (!rootDir) {
    rootDir = new Directory({ account: req.user._id, name: 'root', parent: null });
    await rootDir.save();
  }
  const targetDir = relativePath ? await rootDir.recursiveCreation(req.user, relativePath) : rootDir;

  const results = [];

  for (const file of files) {
    // Sanitize filename
    const finalName = `${v7()}.enc`;

    // Encrypt file with batch key
    const { encryptedData, iv, authTag } = encryptBuffer(file.buffer, secretKey);

    const fullPath = path.join(userDir, finalName);
    fs.writeFileSync(fullPath, encryptedData);

    // Save file metadata
    const fileObj = new File({
      account: req.user._id,
      directory: targetDir._id,
      name: file.originalname,
      storedAs: finalName,
      mime: file.mimetype,
      size: file.size,
      iv,
      authTag,
    });
    await fileObj.save();

    results.push({
      storedAs: finalName,
      original: file.originalname,
      directory: targetDir.name
    });
  }

  return results;
};

// ===== CONTROLLERS =====
const view = async (req, res) => {
  res.render('fileRepository', {});
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

    const result = await encryptFiles(req, [req.file], 'Projects/EncryptedFiles');

    res.status(200).json({
      message: 'File uploaded & encrypted',
      file: result[0]
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

    const results = await encryptFiles(req, req.files, 'Projects/EncryptedFiles');

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

const listFiles = async (req, res) => {
  try {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ redirect: '/auth/login' });
    }

    const { path: dirPath = 'root' } = req.query;

    // 1. Find the directory by name/path
    let startDir = await Directory.findOne({ account: req.user._id, name: dirPath });
    if (!startDir) {
      return res.status(404).json({ message: 'Directory not found' });
    }

    // 2. Fetch child directories
    const directories = await Directory.find({ account: req.user._id, parent: startDir._id })
      .select('name')
      .lean();

    // 3. Fetch files in this directory
    const files = await File.find({ account: req.user._id, directory: startDir._id })
      .select('_id name storedAs mime size')
      .lean();

    res.status(200).json({ directories, files });
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== CREATE DIRECTORY =====
const createDirectory = async (req, res) => {
  const { name, parentPath } = req.body;
  // TODO: implement DB creation
  res.json({ success: true, message: `Directory "${name}" created under "${parentPath}"` });
};

// ===== DOWNLOAD FILE =====
const downloadFile = async (req, res) => {
  const { id } = req.params;
  // TODO: implement file fetch from DB & decryption
  res.status(501).json({ message: 'Download not yet implemented' });
};

//as zip, including subdirecties
const downloadDirectory = async (req, res) => {
  const { id } = req.params;
  // TODO: implement file fetch from DB & decryption
  res.status(501).json({ message: 'Download not yet implemented' });
};

// ===== SEARCH FILES =====
const search = async (req, res) => {
  try {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ redirect: '/auth/login' });
    }

    const { query, filePath = 'root', recursive = true } = req.body;
    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    //const pathSegments = filePath.split(path.sep);

    // 1. Find the directory to start from
    let startDir = await Directory.findOne({ account: req.user._id, name: filePath });
    if (!startDir) {
      return res.status(404).json({ message: 'Directory not found' });
    }

    // 2. Build a list of directory IDs to search in
    let dirIds = [startDir._id];
    if (recursive) {
      // Recursive fetch of all nested directories
      const getNestedDirs = async (parentId) => {
        const children = await Directory.find({ account: req.user._id, parent: parentId });
        for (const child of children) {
          dirIds.push(child._id);
          await getNestedDirs(child._id);
        }
      };
      await getNestedDirs(startDir._id);
    }

    // 3. Search files in those directories
    const regex = new RegExp(query, 'i'); // case-insensitive
    const files = await File.find({
      account: req.user._id,
      directory: { $in: dirIds },
      name: regex
    }).select('name directory storedAs size mime');

    res.status(200).json({ files });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  view,
  search,
  upload,
  uploadMany,
  listFiles,
  createDirectory,
  downloadFile
};