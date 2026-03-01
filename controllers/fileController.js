import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { decrypt, encryptBuffer } from '../utilities/encryption.js';
import File from '../models/file.js';
import Directory from '../models/directory.js';
import { v7 as uuidv7 } from 'uuid';
import archiver from 'archiver';

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
const runMiddleware = (req, res, fn) => new Promise((resolve, reject) => {
    fn(req, res, err => (err ? reject(err) : resolve()));
});

// ===== ensure base uploads dir =====
const baseUploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(baseUploadDir)) fs.mkdirSync(baseUploadDir, { recursive: true });

// ===== BULK SAVE ENCRYPTED FILES =====
const encryptFiles = async (req, files, relativePath = '') => {
    const secretKey = decrypt(req.user.secretKey, req.session.kek);

    const userDir = path.join(baseUploadDir, req.user._id.toString());
    fs.mkdirSync(userDir, { recursive: true });

    // Ensure root directory in DB
    let rootDir = await Directory.findOne({ account: req.user._id, parent: null });
    if (!rootDir) {
    rootDir = new Directory({
        account: req.user._id,
        basename: 'root',
        path: 'root',
        parent: null
    });
    await rootDir.save();
    }

    const targetDir = relativePath ? await rootDir.recursiveCreation(req.user, relativePath) : rootDir;

    const results = [];

    for (const file of files) {
        const finalName = `${uuidv7()}.enc`;
        const { encryptedData, iv, authTag } = encryptBuffer(file.buffer, secretKey);

        const fullPath = path.join(userDir, finalName);
        fs.writeFileSync(fullPath, encryptedData);

        const fileObj = new File({
            account: req.user._id,
            directory: targetDir._id,
            original: file.originalname,
            savedAs: finalName,
            mime: file.mimetype,
            size: file.size,
            iv,
            authTag,
            path: path.join(targetDir.path, file.originalname)
        });
        await fileObj.save();

        results.push({
            storedAs: finalName,
            original: file.originalname,
            directory: targetDir.basename
        });
    }

    return results;
};

// ===== CONTROLLERS =====
const view = async (req, res) => res.render('fileRepository', {});

// ===== PATH UTILITY ======
const resolvePath = (cwd, filepath) => {
    if (!filepath) return cwd || '/';
    // If filepath starts with "/", treat as root
    let fullPath = filepath.startsWith('/') ? filepath : path.join(cwd || '/', filepath);
    // Normalize to remove .., ., duplicate slashes
    fullPath = path.posix.normalize(fullPath);
    return fullPath;
};


// ===== SEARCH =====
const search = async (req, res) => {
    try {
        if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ redirect: '/login.html' });

        const {
            cwd,
            limit = 10,
            offset = 0,
            favouritesOnly,
            filepath,
            matchCase = false,
            matchEntire = false,
            useRegex = false,
            searchTerm,
            searchTags,
            blacklistTags
        } = req.body;

        const resolvedPath = resolvePath(cwd, filepath);
        const conditions = [{ account: req.user._id }];

        // -------------------------
        // Path prefix filter
        // -------------------------
        if (resolvedPath) {
            const regexPath = new RegExp('^' + resolvedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? '' : 'i');
            conditions.push({ path: regexPath });
        }

        // -------------------------
        // Basename search
        // -------------------------
        if (searchTerm) {
            let pattern;
            if (useRegex) {
                pattern = searchTerm;
            } else {
                const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                pattern = matchEntire ? `^${escaped}$` : escaped;
            }
            const regex = new RegExp(pattern, matchCase ? '' : 'i');

            conditions.push({
                $or: [
                    { filename: regex },      // Filename
                    { basename: regex }   // Directory basename
                ]
            });
        }

        // -------------------------
        // Tags filter
        // -------------------------
        if (Array.isArray(searchTags) && searchTags.length > 0) {
            const normalizedTags = searchTags.map(t => t.toLowerCase());
            if (blacklistTags) {
                conditions.push({ searchTags: { $nin: normalizedTags } });
            } else {
                conditions.push({ searchTags: { $all: normalizedTags } });
            }
        }

        // -------------------------
        // Favourites filter
        // -------------------------
        if (favouritesOnly) {
            conditions.push({ isFavourite: true });
        }

        const query = conditions.length > 1 ? { $and: conditions } : conditions[0];

        // -------------------------
        // Count and fetch
        // -------------------------
        const totalDirs = await Directory.countDocuments(query);
        const totalFiles = await File.countDocuments(query);
        const total = totalDirs + totalFiles;

        // Calculate how many directories/files to skip and limit
        let dirsSkip = offset;
        let dirsLimit = 0;
        let filesSkip = 0;
        let filesLimit = 0;

        if (offset < totalDirs) {
            // Some directories are in the page
            dirsSkip = offset;
            dirsLimit = Math.min(limit, totalDirs - offset);

            const remaining = limit - dirsLimit;
            if (remaining > 0) {
                filesSkip = 0;
                filesLimit = remaining;
            }
        } else {
            // Offset is beyond directories, only files remain
            dirsSkip = totalDirs; 
            dirsLimit = 0;

            filesSkip = offset - totalDirs;
            filesLimit = limit;
        }

        // Fetch directories
        const dirs = dirsLimit > 0 ? await Directory.find(query)
            .skip(dirsSkip)
            .limit(dirsLimit)
            .sort({ path: 1 })
            .select('-__v') : [];

        // Fetch files
        const files = filesLimit > 0 ? await File.find(query)
            .skip(filesSkip)
            .limit(filesLimit)
            .sort({ filename: 1 })
            .select('-iv -authTag -__v') : [];

        res.json({
            total,
            directories: dirs.map(d => d.toJSON()),
            files: files.map(f => f.toJSON()),
            resolvedPath
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ===== SINGLE UPLOAD =====
const upload = async (req, res) => {
    try {
        if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ redirect: '/login.html' });

        await runMiddleware(req, res, uploader.single('file'));
        if (!req.file) return res.status(400).json({ message: 'No file provided' });

        const result = await encryptFiles(req, [req.file], 'Projects/EncryptedFiles');
        res.status(200).json({ message: 'File uploaded & encrypted', file: result[0] });
    } catch (err) {
        if (err instanceof multer.MulterError) return res.status(400).json({ message: `Upload error: ${err.message}` });
        console.error('Upload Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ===== MULTI UPLOAD =====
const uploadMany = async (req, res) => {
    try {
        if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ redirect: '/login.html' });

        await runMiddleware(req, res, uploader.array('file[]', maxFiles));
        if (!req.files?.length) return res.status(400).json({ message: 'No files provided' });

        const results = await encryptFiles(req, req.files, 'Projects/EncryptedFiles');
        res.status(200).json({ message: 'Files uploaded & encrypted', files: results });
    } catch (err) {
        if (err instanceof multer.MulterError) return res.status(400).json({ message: `Upload error: ${err.message}` });
        console.error('Upload Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ===== LIST FILES & DIRECTORIES =====
const listFiles = async (req, res) => {
    try {
        if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ redirect: '/login.html' });

        const { path: dirPath = 'root' } = req.params;
        const startDir = await Directory.findOne({ account: req.user._id, path: dirPath });
        if (!startDir) return res.status(404).json({ message: 'Directory not found' });

        const directories = await Directory.find({ account: req.user._id, parent: startDir._id }).select('basename path').lean();
        const files = await File.find({ account: req.user._id, directory: startDir._id }).select('original savedAs mime size').lean();

        res.status(200).json({ directories, files });
    } catch (err) {
        console.error('List files error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// ===== CREATE DIRECTORY =====
const createDirectory = async (req, res) => {
  try {
    if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ redirect: '/login.html' });

    const { name, parentPath } = req.body;
    let parentDir = await Directory.findOne({ account: req.user._id, path: parentPath });
    if (!parentDir) return res.status(404).json({ message: 'Parent directory not found' });

    const newDir = new Directory({
      account: req.user._id,
      parent: parentDir._id,
      basename: name,
      path: path.join(parentDir.path, name)
    });
    await newDir.save();

    res.json({ success: true, message: `Directory "${name}" created under "${parentPath}"`, directory: newDir });
  } catch (err) {
    console.error('Create directory error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== DOWNLOAD FILE =====
const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await File.findById(id);
    if (!file) return res.status(404).json({ message: 'File not found' });

    if (!(await file.checkAccess(req.user))) return res.status(403).json({ message: 'Access denied' });

    const filePath = path.join(baseUploadDir, req.user._id.toString(), file.savedAs);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing on server' });

    const encrypted = fs.readFileSync(filePath);
    const decrypted = decrypt(encrypted, decrypt(req.user.secretKey, req.session.kek), file.iv, file.authTag);

    res.setHeader('Content-Disposition', `attachment; filename="${file.original}"`);
    res.setHeader('Content-Type', file.mime);
    res.send(decrypted);
  } catch (err) {
    console.error('Download file error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ===== DOWNLOAD DIRECTORY AS ZIP =====
const downloadDirectory = async (req, res) => {
  try {
    const { id } = req.params;
    const dir = await Directory.findById(id);
    if (!dir) return res.status(404).json({ message: 'Directory not found' });

    if (!(await dir.checkAccess(req.user))) return res.status(403).json({ message: 'Access denied' });

    res.setHeader('Content-Disposition', `attachment; filename="${dir.basename}.zip"`);
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip');
    archive.pipe(res);

    const addDirFiles = async (directory) => {
      const files = await File.find({ directory: directory._id });
      for (const f of files) {
        const filePath = path.join(baseUploadDir, req.user._id.toString(), f.savedAs);
        if (fs.existsSync(filePath)) archive.file(filePath, { name: path.join(directory.basename, f.original) });
      }
      const subdirs = await Directory.find({ parent: directory._id });
      for (const sub of subdirs) await addDirFiles(sub);
    };

    await addDirFiles(dir);
    await archive.finalize();
  } catch (err) {
    console.error('Download directory error:', err);
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
  downloadFile,
  downloadDirectory
};