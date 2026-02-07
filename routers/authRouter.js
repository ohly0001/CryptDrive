import express from "express";
import controller from "../controllers/authController.js";

const router = express.Router();

router.post("/login", controller.login);
router.post("/register", controller.register);
router.post("/activate", controller.activate);
router.post("/logout", controller.logout);
router.post("/deregister", controller.deregister);
router.get("/completed", controller.completed);

export default router;