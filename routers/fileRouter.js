import express from "express";
import controller from "../controllers/fileController.js";

const router = express.Router();

router.get("/", controller.view);
router.post("/upload", controller.upload);
router.post("/uploadMany", controller.uploadMany);
router.get("/list", controller.listFiles);
router.post("/directory/create", controller.createDirectory);
router.get("/download/:id", controller.downloadFile);
router.post("/search", controller.search);

export default router;
