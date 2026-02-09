import express from "express";
import controller from "../controllers/accountController.js";

const router = express.Router();

router.post("/update", controller.update);
router.post("/management", controller.view);

export default router;