import express from 'express';
import { AuthController } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

export default router;
