import express from 'express';
import { ProfileController } from '../controllers/profileController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/me', ProfileController.getProfile);
router.get('/:userId', ProfileController.getProfile);
router.put('/me', ProfileController.updateProfile);
router.post('/photos', ProfileController.uploadPhoto);

export default router;
