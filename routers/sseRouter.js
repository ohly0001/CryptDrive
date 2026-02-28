import express from "express";
import scheduler from "../sse/scheduler.js";

const router = express.Router();

router.get("/subscribe", scheduler.subscribe);
router.post("/stayin-alive", scheduler.updateTimeout);

export default router;