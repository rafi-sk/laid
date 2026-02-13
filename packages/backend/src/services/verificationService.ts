import crypto from 'crypto';
import { query } from '../config/database.js';

export class VerificationService {
  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async storeVerificationToken(
    userId: string,
    token: string
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await query(
      'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
      [token, expiresAt, userId]
    );
  }

  static async validateVerificationToken(token: string): Promise<string | null> {
    const result = await query(
      'SELECT id FROM users WHERE verification_token = $1 AND verification_token_expires > NOW() AND email_verified = FALSE',
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].id;
  }

  static async markEmailAsVerified(userId: string): Promise<void> {
    await query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1',
      [userId]
    );
  }
}
