import express from 'express';
import { MatchController } from '../controllers/matchController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', MatchController.getMatches);
router.delete('/:matchId', MatchController.unmatch);

export default router;
