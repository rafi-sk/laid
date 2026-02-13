import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export class EmailService {
  static async sendVerificationEmail(
    email: string,
    verificationToken: string
  ): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@laid.app',
      to: email,
      subject: 'Verify your email - Laid',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF6B6B;">Welcome to Laid!</h2>
          <p>Thanks for signing up. Please verify your email address to get started.</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #FF6B6B; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Verify Email
          </a>
          <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  }

  static async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@laid.app',
      to: email,
      subject: 'Welcome to Laid!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF6B6B;">Welcome, ${name}!</h2>
          <p>Your email has been verified. You're all set to start connecting with amazing people.</p>
          <a href="${process.env.FRONTEND_URL}/discover" style="display: inline-block; padding: 12px 24px; background-color: #FF6B6B; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Start Exploring
          </a>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  }

  static async sendPasswordResetEmail(
    email: string,
    resetToken: string
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@laid.app',
      to: email,
      subject: 'Reset your password - Laid',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF6B6B;">Reset Your Password</h2>
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #FF6B6B; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Reset Password
          </a>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  }
}
