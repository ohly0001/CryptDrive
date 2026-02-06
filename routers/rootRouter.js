import express from "express";
import authRouter from "./authRouter.js";
import dashRouter from "./dashRouter.js";
import passRouter from "./passRouter.js";

const router = express.Router();

router.use('/auth', authRouter);     // Auth endpoints
router.use('/dash', dashRouter);
router.use('/pass', passRouter);

export default router;