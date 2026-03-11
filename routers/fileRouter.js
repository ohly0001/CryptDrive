import express from "express";
import controller from "../controllers/fileController.js";

const router = express.Router();

router.post("/view", controller.search);
router.post("/search", controller.search);
router.post("/upload", controller.uploadFiles);
router.post("/directory/create", controller.createDirectory);
router.post("/directory/delete", controller.deleteDirectory);
router.delete("/delete/:id", controller.deleteFile);
router.post("/rename", controller.renameItem);
router.post("/move", controller.moveItem);
router.post("/toggleFavourite", controller.toggleFavourite);
router.get("/download/:id", controller.downloadFile);

export default router;