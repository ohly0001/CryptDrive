import express from "express";
import controller from "../controllers/dashController.js";

const router = express.Router();

router.get("/", controller.view);

export default router;