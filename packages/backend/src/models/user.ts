import { query } from '../config/database.js';

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  email_verified: boolean;
  verification_token?: string;
  verification_token_expires?: Date;
  google_id?: string;
  apple_id?: string;
  facebook_id?: string;
  instagram_id?: string;
  is_verified_user: boolean;
  is_suspended: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password_hash?: string;
  google_id?: string;
  apple_id?: string;
  facebook_id?: string;
  instagram_id?: string;
  email_verified?: boolean;
}

export class UserModel {
  static async createUser(data: CreateUserData): Promise<User> {
    const result = await query(
      `INSERT INTO users (email, password_hash, google_id, apple_id, facebook_id, instagram_id, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.email,
        data.password_hash || null,
        data.google_id || null,
        data.apple_id || null,
        data.facebook_id || null,
        data.instagram_id || null,
        data.email_verified || false,
      ]
    );

    return result.rows[0];
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async findUserById(id: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async findUserByGoogleId(googleId: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE google_id = $1', [
      googleId,
    ]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async findUserByAppleId(appleId: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE apple_id = $1', [
      appleId,
    ]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async findUserByFacebookId(facebookId: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE facebook_id = $1', [
      facebookId,
    ]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async findUserByInstagramId(
    instagramId: string
  ): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE instagram_id = $1', [
      instagramId,
    ]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const fields = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    const values = Object.values(updates);

    const result = await query(
      `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    return result.rows[0];
  }

  static async deleteUser(id: string): Promise<void> {
    await query('DELETE FROM users WHERE id = $1', [id]);
  }
}
