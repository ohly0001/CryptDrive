import express from "express";
import controller from "../controllers/navController.js";

const router = express.Router();

router.get("/home", controller.viewHome);
router.get("/accountManagement", controller.viewAccountManagement);
router.get("/groupManagement", controller.viewGroupManagement);
router.get("/passwordVault", controller.viewPasswordVault);
router.get("/passwordFactory", controller.viewPasswordFactory);
router.get("/fileRepository", controller.viewFileRepository);
router.get("/noteKeeper", controller.viewNotekeeper);

export default router;