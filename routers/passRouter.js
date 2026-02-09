import express from "express";
import controller from "../controllers/passController.js";

const router = express.Router();

router.get("/pull", controller.pull);
router.get("/paste", controller.paste);

export default router;