import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import File from '../models/file.js';
import Directory from '../models/directory.js';
import cryptDriveConfig from "../config/cryptDriveConfig.json" assert { type: "json" };
import { encryptBuffer, decryptBuffer } from '../utilities/encryption.js';

// Multer in-memory
const uploadMemory = multer({ storage: multer.memoryStorage() });

// ===== SEARCH =====
const search = async (req, res, next) => {
  try {
    const { cwd, limit, offset, favouritesOnly, searchTerm, matchCase, matchEntire, useRegex, searchTags, blacklistTags } = req.body;
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
      if (blacklistTags) {
        fileConditions.push({ searchTags: { $nin: normalizedTags } });
        dirConditions.push({ searchTags: { $nin: normalizedTags } });
      } else {
        fileConditions.push({ searchTags: { $all: normalizedTags } });
        dirConditions.push({ searchTags: { $all: normalizedTags } });
      }
    }

    const files = await File.find(fileConditions.length > 1 ? { $and: fileConditions } : fileConditions[0])
      .skip(offsetNum).limit(limitNum);
    const directories = await Directory.find(dirConditions.length > 1 ? { $and: dirConditions } : dirConditions[0]);

    res.json({ files, directories });
  } catch (err) { next(err); }
};

// ===== UPLOAD FILES =====
const uploadFiles = [
  uploadMemory.any(),
  async (req, res, next) => {
    try {
      const userId = req.user._id;
      const secretKey = req.session?.secretKey;
      if (!secretKey) return res.status(401).json({ message: 'Vault locked' });

      const pathParam = (req.query.path || '/').trim() || '/';
      const uploadedFiles = [];
      const userFolder = path.join(cryptDriveConfig.storageRoot, userId.toString());
      if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });

      for (const file of req.files) {
        const { encryptedData, meta } = encryptBuffer(file.buffer, secretKey);
        const fileId = uuidv4();
        const storagePath = path.join(userFolder, `${fileId}.enc`);
        fs.writeFileSync(storagePath, encryptedData);

        const dbFile = new File({
          account: userId,
          filename: file.originalname,
          mime: file.mimetype,
          size: file.size,
          path: pathParam,
          storagePath,
          iv: meta.iv,
          authTag: meta.authTag,
          searchTags: [],
          isFavourite: []
        });

        await dbFile.save();
        uploadedFiles.push(dbFile);
      }

      res.json({ success: true, uploadedFiles });
    } catch (err) { next(err); }
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
      if (fs.existsSync(sub.storagePath)) fs.rmdirSync(sub.storagePath, { recursive: true });
      await sub.deleteOne();
    }

    if (fs.existsSync(dir.storagePath)) fs.rmdirSync(dir.storagePath, { recursive: true });
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
export const downloadFile = async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const secretKey = req.session?.secretKey;
    if (!secretKey) return res.status(401).json({ message: 'Vault locked' });

    const file = await getFileById(fileId, req.user);
    if (!file) return res.status(404).send('File not found');
    if (!fs.existsSync(file.storagePath)) return res.status(404).send('File missing on server');

    const encryptedData = fs.readFileSync(file.storagePath);
    const decryptedBuffer = decryptBuffer(encryptedData, { iv: file.iv, authTag: file.authTag }, secretKey);

    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Type', file.mime || 'application/octet-stream');
    res.send(decryptedBuffer);
  } catch (err) { next(err); }
};

// ===== EXPORT =====
export default {
  search,
  uploadFiles,
  createDirectory,
  deleteDirectory,
  deleteFile,
  renameItem,
  moveItem,
  toggleFavourite,
  downloadFile
};