import express from 'express';
import controller from '../controllers/groupController.js';

const router = express.Router();

router.post('/create', controller.createGroup);
router.get('/viewAdd', controller.viewCreateGroup);
router.post('/list', controller.listGroups);
router.post('/join', controller.joinGroup);
router.post('/leave', controller.leaveGroup);
router.post('/delete', controller.deleteGroup);
router.post('/addMembers', controller.addMembers);
router.post('/removeMembers', controller.removeMembers);
router.post('/favourite', controller.toggleFavourite);

export default router;