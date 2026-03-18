// rootRouter.js
import express from "express";
import authRouter from "./authRouter.js";
import navRouter from "./navRouter.js";
import passRouter from "./passRouter.js";
import fileRouter from "./fileRouter.js";
import accountRouter from "./accountRouter.js";
import groupRouter from "./groupRouter.js";
import sseRouter from "./sseRouter.js";
import noteRouter from "./noteRouter.js";
import { isAuthenticated } from '../middleware/authCheck.js';

const router = express.Router();

router.use('/auth', authRouter); 
router.use('/', navRouter);
router.use('/pass', isAuthenticated, passRouter);
router.use('/note', isAuthenticated, noteRouter);
router.use('/file', isAuthenticated, fileRouter);
router.use('/account', isAuthenticated, accountRouter);
router.use('/groups', isAuthenticated, groupRouter);
router.use('/sse', sseRouter);

export default router;