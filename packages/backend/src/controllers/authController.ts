import { Request, Response } from 'express';
import { UserModel } from '../models/user.js';
import { PasswordValidator, validateEmail } from '../utils/passwordValidator.js';
import { hashPassword, comparePassword } from '../utils/passwordHash.js';
import { TokenService } from '../services/tokenService.js';
import { EmailService } from '../services/emailService.js';
import { VerificationService } from '../services/verificationService.js';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate email format
      if (!validateEmail(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      // Validate password
      const passwordValidation = PasswordValidator.validate(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({ errors: passwordValidation.errors });
        return;
      }

      // Check if email already exists
      const existingUser = await UserModel.findUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'Email already in use' });
        return;
      }

      // Hash password
      const password_hash = await hashPassword(password);

      // Create user
      const user = await UserModel.createUser({
        email,
        password_hash,
      });

      // Generate verification token
      const verificationToken = VerificationService.generateVerificationToken();
      await VerificationService.storeVerificationToken(
        user.id,
        verificationToken
      );

      // Send verification email
      await EmailService.sendVerificationEmail(email, verificationToken);

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        userId: user.id,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate email format
      if (!validateEmail(email)) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Find user
      const user = await UserModel.findUserByEmail(email);
      if (!user || !user.password_hash) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check if email is verified
      if (!user.email_verified) {
        res.status(403).json({ error: 'Email not verified. Please check your email.' });
        return;
      }

      // Check if account is suspended
      if (user.is_suspended) {
        res.status(403).json({ error: 'Account suspended' });
        return;
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate tokens
      const tokens = await TokenService.generateTokenPair({
        userId: user.id,
        email: user.email,
      });

      res.status(200).json({
        message: 'Login successful',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified,
          isVerifiedUser: user.is_verified_user,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Verification token required' });
        return;
      }

      const userId = await VerificationService.validateVerificationToken(token);
      if (!userId) {
        res.status(400).json({ error: 'Invalid or expired verification token' });
        return;
      }

      await VerificationService.markEmailAsVerified(userId);

      const user = await UserModel.findUserById(userId);
      if (user) {
        await EmailService.sendWelcomeEmail(user.email, user.email.split('@')[0]);
      }

      res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!validateEmail(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      const user = await UserModel.findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.email_verified) {
        res.status(400).json({ error: 'Email already verified' });
        return;
      }

      const verificationToken = VerificationService.generateVerificationToken();
      await VerificationService.storeVerificationToken(user.id, verificationToken);
      await EmailService.sendVerificationEmail(email, verificationToken);

      res.status(200).json({ message: 'Verification email sent' });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken, userId } = req.body;

      if (!refreshToken || !userId) {
        res.status(400).json({ error: 'Refresh token and user ID required' });
        return;
      }

      const tokens = await TokenService.refreshTokens(userId, refreshToken);
      if (!tokens) {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
      }

      res.status(200).json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken, userId } = req.body;

      if (refreshToken && userId) {
        await TokenService.revokeRefreshToken(userId, refreshToken);
      }

      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
