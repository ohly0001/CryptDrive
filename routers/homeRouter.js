import express from "express";
import controller from "../controllers/homeController.js";

const router = express.Router();

router.get("/", controller.viewHome);
router.get("/accountManagement", controller.viewAccountManagement);
router.get("/passwordVault", controller.viewPasswordVault);
router.get("/passwordFactory", controller.viewPasswordFactory);
router.get("/fileRepository", controller.viewFileRepository);

export default router;