import express from "express";
import controller from "../controllers/passController.js";

const router = express.Router();

router.get("/pull", controller.pull);

export default router;