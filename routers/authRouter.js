// authRouter.js
import express from "express";
import controller from "../controllers/authController.js";
import { isAuthenticated } from '../middleware/authCheck.js';

const router = express.Router();

router.post("/login", controller.login);
router.post("/register", controller.register);
router.post("/activate", controller.activate);
router.post("/logout", isAuthenticated, controller.logout);
router.post("/deregister", isAuthenticated, controller.deregister);
router.get("/autologin", controller.autologin);
router.get("/resend", controller.resend);

export default router;