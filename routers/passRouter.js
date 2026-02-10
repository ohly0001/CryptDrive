import express from "express";
import controller from "../controllers/passController.js";

const router = express.Router();

router.get("/pull", controller.pull);
router.get("/copy", controller.copy);
router.post("/edit/:id", controller.edit);
router.get("/viewEdit/:id", controller.viewEdit);
router.get("/addView", controller.addView);
router.post("/add", controller.add);

export default router;