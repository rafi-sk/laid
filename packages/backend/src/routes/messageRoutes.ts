import express from 'express';
import { MessageController } from '../controllers/messageController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/:matchId', MessageController.getMessages);
router.post('/:matchId', MessageController.sendMessage);

export default router;
