import express from "express";
import controller from "../controllers/passController.js";

const router = express.Router();

router.post("/search", controller.search);
router.post("/copy", controller.copy);
router.post("/edit/:id", controller.edit);
router.get("/viewEdit/:id", controller.viewEdit);
router.get("/viewAdd", controller.viewAdd);
router.post("/add", controller.add);

router.post("/deleteMany", controller.deleteMany);
router.post("/favouriteMany", controller.favouriteMany);
router.post("/toggleFavourite", controller.toggleFavourite);

export default router;