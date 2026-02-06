import express from "express";
import authRouter from "./authRouter.js";
import dashRouter from "./dashRouter.js";

const router = express.Router();

router.use('/auth', authRouter);     // Auth endpoints
router.use('/dash', dashRouter);

export default router;