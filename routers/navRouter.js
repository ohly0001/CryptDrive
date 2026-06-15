import express from "express";
import controller from "../controllers/navController.js";
import { isAuthenticated } from "../middleware/authCheck.js";

const router = express.Router();

router.get("/home", controller.viewHome);
router.get("/accountManagement", isAuthenticated, controller.viewAccountManagement);
router.get("/groupManagement", isAuthenticated, controller.viewGroupManagement);
router.get("/passwordVault", isAuthenticated, controller.viewPasswordVault);
router.get("/passwordFactory", controller.viewPasswordFactory);
router.get("/fileRepository", isAuthenticated, controller.viewFileRepository);
router.get("/noteKeeper", isAuthenticated, controller.viewNotekeeper);
router.get("/login", controller.viewLogin);
router.get("/register", controller.viewRegister);

export default router;