import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class TokenService {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  static generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  static async storeRefreshToken(
    userId: string,
    refreshToken: string
  ): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );
  }

  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  static async validateRefreshToken(
    userId: string,
    refreshToken: string
  ): Promise<boolean> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const result = await query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW() AND revoked = FALSE',
      [userId, tokenHash]
    );

    return result.rows.length > 0;
  }

  static async revokeRefreshToken(
    userId: string,
    refreshToken: string
  ): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND token_hash = $2',
      [userId, tokenHash]
    );
  }

  static async revokeAllUserTokens(userId: string): Promise<void> {
    await query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1',
      [userId]
    );
  }

  static async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken();
    
    await this.storeRefreshToken(payload.userId, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  static async refreshTokens(
    userId: string,
    oldRefreshToken: string
  ): Promise<TokenPair | null> {
    const isValid = await this.validateRefreshToken(userId, oldRefreshToken);
    
    if (!isValid) {
      return null;
    }

    // Revoke old refresh token (token rotation)
    await this.revokeRefreshToken(userId, oldRefreshToken);

    // Get user email for new token
    const userResult = await query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const email = userResult.rows[0].email;

    // Generate new token pair
    return await this.generateTokenPair({ userId, email });
  }
}
