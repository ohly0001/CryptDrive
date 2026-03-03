import express from "express";
import authRouter from "./authRouter.js";
import homeRouter from "./homeRouter.js";
import passRouter from "./passRouter.js";
import fileRouter from "./fileRouter.js";
import accountRouter from "./accountRouter.js";
import groupRouter from "./groupRouter.js";
import sseRouter from "./sseRouter.js";
import { isAuthenticated } from '../middleware/authCheck.js';

const router = express.Router();

router.use('/auth', authRouter); 
router.use('/home', isAuthenticated, homeRouter);
router.use('/pass', isAuthenticated, passRouter);
router.use('/file', isAuthenticated, fileRouter);
router.use('/account', isAuthenticated, accountRouter);
router.use('/groups', isAuthenticated, groupRouter);
router.use('/sse', sseRouter);

export default router;