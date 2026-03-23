// authRouter.js
import express from "express";
import controller from "../controllers/authController.js";
import { isAuthenticated } from '../middleware/authCheck.js';

const router = express.Router();

router.get("/login", controller.viewLogin);
router.post("/login", controller.login);
router.get("/register", controller.viewRegister);
router.post("/register", controller.register);
router.get("/registerCode", controller.viewRegisterCode);
router.post("/registerCode", controller.registerCode);
router.post("/logout", isAuthenticated, controller.logout);
router.post("/deregister", isAuthenticated, controller.deregister);
router.get("/autologin", controller.autologin);
router.get("/resend", controller.resend);

export default router;