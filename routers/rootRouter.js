import express from "express";
import authRouter from "./authRouter.js";
import homeRouter from "./homeRouter.js";
import passRouter from "./passRouter.js";
import accountRouter from "./accountRouter.js";

const router = express.Router();

router.use('/auth', authRouter);     // Auth endpoints
router.use('/home', homeRouter);
router.use('/pass', passRouter);
router.use('/account', accountRouter);

export default router;