import express from 'express';
import { DiscoveryController } from '../controllers/discoveryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/feed', DiscoveryController.getDiscoveryFeed);
router.post('/swipe', DiscoveryController.swipe);

export default router;
