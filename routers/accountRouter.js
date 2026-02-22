import express from "express";
import controller from "../controllers/accountController.js";

const router = express.Router();

router.post("/update", controller.update);
router.get("/pull", controller.pull);

export default router;