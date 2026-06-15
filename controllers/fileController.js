// fileController.js
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import File from '../models/file.js';
import Directory from '../models/directory.js';
import cryptDriveConfig from "../config/cryptDriveConfig.json" with { type: "json" };
import { encryptBuffer, decryptBuffer, encrypt, decrypt } from '../utilities/encryption.js';
import { lookup } from 'mime-types';
import Account from '../models/account.js';

const mimeToCategory = {
    audio: new Set(['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']),
    video: new Set(['video/mp4', 'video/webm', 'video/ogg']),
    image: new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']),
    pdf: new Set(['application/pdf']),
    word: new Set(['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    excel: new Set(['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
    powerpoint: new Set(['application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation']),
    csv: new Set(['text/csv']),
    code: new Set(['text/html','text/css','application/javascript','application/json','application/xml']),
    text: new Set(['text/plain','text/markdown']),
    zip: new Set(['application/zip','application/x-7z-compressed','application/x-rar-compressed']),
    secure: new Set(['application/pgp-encrypted','application/x-pem-file']),
    crypto: new Set(['application/x-bitcoin']),
    medical: new Set(['application/hl7-v2','application/fhir+json']),
    system: new Set(['application/octet-stream'])
};

function getCategory(mime) {
    for (const [category, mimes] of Object.entries(mimeToCategory)) {
        if (mimes.has(mime)) return category;
    }
    return 'unknown/any'; // Fallback for unknown types
};

// Multer in-memory
const uploadMemory = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 10 // Max 10 files per request
  }
});

// ===== SEARCH =====
const search = async (req, res, next) => {
  try {
    const {
      cwd,
      limit,
      offset,
      favouritesOnly,
      searchTerm,
      matchCase,
      matchEntire,
      useRegex,
      searchTags,
      blacklistTags
    } = req.body;

    const limitNum = Math.max(parseInt(limit) || 10, 1);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);
    const userId = req.user._id;

    const fileConditions = [{ account: userId, path: cwd }];
    const dirConditions = [{ account: userId, path: cwd }];

    if (favouritesOnly) {
      fileConditions.push({ isFavourite: userId });
      dirConditions.push({ isFavourite: userId });
    }

    if (searchTerm) {
      let pattern;
      if (useRegex) pattern = searchTerm;
      else {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = matchEntire ? `^${escaped}$` : escaped;
      }
      const regex = new RegExp(pattern, matchCase ? '' : 'i');
      fileConditions.push({ $or: [{ filename: regex }, { searchTags: regex }] });
      dirConditions.push({ basename: regex });
    }

    if (searchTags?.length) {
      const normalizedTags = searchTags.map(t => t.toLowerCase());
      const tagQuery = blacklistTags
        ? { $nin: normalizedTags }
        : { $all: normalizedTags };

      fileConditions.push({ searchTags: tagQuery });
      dirConditions.push({ searchTags: tagQuery });
    }

    // Fetch all matching files and directories
    const files = await File.find(fileConditions.length > 1 ? { $and: fileConditions } : fileConditions[0]);
    const directories = await Directory.find(dirConditions.length > 1 ? { $and: dirConditions } : dirConditions[0]);

    // Combine and prioritize
    const combined = [
      ...directories.map(d => ({ ...d.toObject(), _isDir: true })),
      ...files.map(f => ({ ...f.toObject(), _isDir: false }))
    ];

    // Sort: favourites first, then directories first, then type -> title
    combined.sort((a, b) => {
      // 1. Favourites first
      const favA = a.isFavourite === userId ? 1 : 0;
      const favB = b.isFavourite === userId ? 1 : 0;
      if (favB !== favA) return favB - favA;

      // 2. Directories before files
      if (a._isDir !== b._isDir) return a._isDir ? -1 : 1;

      // 3. Type -> title
      if (a.type && b.type && a.type !== b.type) return a.type.localeCompare(b.type);
      return (a._isDir ? a.basename : a.filename).localeCompare(b._isDir ? b.basename : b.filename);
    });

    // Paginate combined list
    const paginated = combined.slice(offsetNum, offsetNum + limitNum);

    const paginatedDirs = paginated.filter(i => i._isDir);
    const paginatedFiles = paginated.filter(i => !i._isDir);

    res.json({
      directories: paginatedDirs,
      files: paginatedFiles
    });
  } catch (err) {
    next(err);
  }
};

// ===== UPLOAD FILES =====
const uploadFiles = [
  uploadMemory.any(),
  async (req, res, next) => {
    try {
      if (!req.session?.kek) return res.status(401).json({ message: 'Vault locked' });
      const userId = req.user._id;
      const secretKey = decrypt(req.user.secretKey, req.session.kek);
      const pathParam = (req.query.path || '/').trim() || '/';

      const uploadedFiles = [];
      const userFolder = path.join('./uploads', userId.toString());
      if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });

      for (const file of req.files) {
        const { encryptedData, meta } = encryptBuffer(file.buffer, secretKey);
        const fileId = uuidv4();
        const storagePath = path.join(userFolder, `${fileId}.enc`);
        const mime = lookup(file.originalname) || file.mimetype;
        fs.writeFileSync(storagePath, encryptedData);

        const dbFile = new File({
          account: userId,
          filename: file.originalname,
          mime,
          size: file.size,
          path: pathParam,
          storagePath,
          iv: meta.iv,
          authTag: meta.authTag,
          searchTags: getCategory(mime),
          isFavourite: [],
        });
        await dbFile.save();
        uploadedFiles.push(dbFile);
      }

      res.json({ success: true, uploadedFiles });
    } catch (err) {
      next(err);
    }
  }
];


// ===== CREATE DIRECTORY =====
const createDirectory = async (req, res, next) => {
  try {
    const { name, parentPath } = req.body;
    const storagePath = path.join(cryptDriveConfig.storageRoot, req.user._id.toString(), uuidv4());
    if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

    const dir = new Directory({
      account: req.user._id,
      path: parentPath,
      basename: name,
      storagePath,
      shared: [],
      isFavourite: [],
      searchTags: [],
    });

    await dir.save();
    res.json({ success: true, directory: dir });
  } catch (err) { next(err); }
};

// ===== DELETE FILE =====
const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await File.findById(id);
    if (!file) return res.status(404).json({ success: false });

    if (fs.existsSync(file.storagePath)) fs.unlinkSync(file.storagePath);
    await file.deleteOne();

    res.json({ success: true });
  } catch (err) { next(err); }
};

// ===== DELETE DIRECTORY =====
const deleteDirectory = async (req, res, next) => {
  try {
    const { id } = req.body;
    const dir = await Directory.findById(id);
    if (!dir) return res.status(404).json({ success: false });

    // Delete files in directory
    const files = await File.find({ path: path.join(dir.path, dir.basename) });
    for (const file of files) {
      if (fs.existsSync(file.storagePath)) fs.unlinkSync(file.storagePath);
      await file.deleteOne();
    }

    // Delete subdirectories recursively
    const subDirs = await Directory.find({ path: path.join(dir.path, dir.basename) });
    for (const sub of subDirs) {
      if (fs.existsSync(sub.storagePath)) fs.rmSync(sub.storagePath, { recursive: true });
      await sub.deleteOne();
    }

    if (fs.existsSync(dir.storagePath)) fs.rmSync(dir.storagePath, { recursive: true });
    await dir.deleteOne();

    res.json({ success: true });
  } catch (err) { next(err); }
};

// ===== RENAME ITEM =====
const renameItem = async (req, res, next) => {
  try {
    const { id, type, newName } = req.body;
    if (type === 'file') {
      const file = await File.findById(id);
      if (!file) return res.status(404).json({ success: false });
      file.filename = newName;
      await file.save();
    } else if (type === 'directory') {
      const dir = await Directory.findById(id);
      if (!dir) return res.status(404).json({ success: false });
      dir.basename = newName;
      await dir.save();
    }
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ===== MOVE ITEM =====
const moveItem = async (req, res, next) => {
  try {
    const { id, type, destPath } = req.body;
    if (type === 'file') {
      const file = await File.findById(id);
      if (!file) return res.status(404).json({ success: false });
      file.path = destPath;
      await file.save();
    } else if (type === 'directory') {
      const dir = await Directory.findById(id);
      if (!dir) return res.status(404).json({ success: false });
      dir.path = destPath;
      await dir.save();
    }
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ===== TOGGLE FAVOURITE =====
const toggleFavourite = async (req, res, next) => {
  try {
    const { id, state } = req.body;
    await File.findByIdAndUpdate(id, { $set: { isFavourite: state } });
    await Directory.findByIdAndUpdate(id, { $set: { isFavourite: state } });
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ===== GET FILE BY ID =====
export const getFileById = async (fileId, user) => {
  const file = await File.findById(fileId);
  if (!file) return null;
  if (!file.account.equals(user._id) && !(file.shared?.some(id => id.equals(user._id)))) return null;
  return file;
};

// ===== DOWNLOAD FILE =====
const downloadFile = async (req, res, next) => {
  try {
    if (!req.session?.kek) return res.status(401).json({ message: 'Vault locked' });
    const secretKey = decrypt(req.user.secretKey, req.session.kek);

    const file = await File.findById(req.params.id);
    if (!file || !file.account.equals(req.user._id)) return res.status(404).send('File not found');
    if (!fs.existsSync(file.storagePath)) return res.status(404).send('File missing on server');

    const encryptedData = fs.readFileSync(file.storagePath);
    const decryptedBuffer = decryptBuffer(encryptedData, { iv: file.iv, authTag: file.authTag }, secretKey);

    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Type', file.mime || 'application/octet-stream');
    res.send(decryptedBuffer);
  } catch (err) {
    next(err);
  }
};

const viewFile = async (req, res, next) => {
  try {
      const id = req.params.id;

      const file = await File.findOne({
          _id: id,
          account: req.user._id
      });

      if (!file) {
          return res.status(404).send('File not found');
      }

      const owner = await Account.findById(file.account);

      const safeFile = {
          _id: file._id,
          filename: file.filename,
          mime: file.mime,
          size: file.size,
          account: owner.username,
          path: file.path,

          isFavourite: file.isFavourite || [],
          createdAt: file.createdAt,
          updatedAt: file.updatedAt
      };

      res.render('viewFile', {
          file: safeFile,
          account: req.user
      });

  } catch (err) {
      next(err);
  }
};

// ===== EXPORT =====
export default {
  search,
  viewFile,
  uploadFiles,
  createDirectory,
  deleteDirectory,
  deleteFile,
  renameItem,
  moveItem,
  toggleFavourite,
  downloadFile
};