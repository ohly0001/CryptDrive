import express from 'express';
import controller from '../controllers/groupController.js';
import { isAuthenticated } from '../middleware/authCheck.js'; // ensures req.user exists

const router = express.Router();

router.post('/create', isAuthenticated, controller.createGroup);
router.post('/list', isAuthenticated, controller.listGroups);
router.post('/join', isAuthenticated, controller.joinGroup);
router.post('/leave', isAuthenticated, controller.leaveGroup);
router.post('/delete', isAuthenticated, controller.deleteGroup);
router.post('/addMembers', isAuthenticated, controller.addMembers);
router.post('/removeMembers', isAuthenticated, controller.removeMembers);
router.post('/favourite', isAuthenticated, controller.toggleFavourite);

export default router;