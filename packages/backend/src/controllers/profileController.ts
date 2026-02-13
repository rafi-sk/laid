import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';

export class ProfileController {
  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { displayName, age, bio, location, interests } = req.body;

      await query(
        'UPDATE users SET display_name = $1, age = $2, bio = $3, location = $4, interests = $5, updated_at = NOW() WHERE id = $6',
        [displayName, age, bio, location, interests, userId]
      );

      res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async uploadPhoto(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { photoUrl, photoOrder } = req.body;

      const result = await query(
        'INSERT INTO profile_photos (user_id, photo_url, photo_order) VALUES ($1, $2, $3) RETURNING *',
        [userId, photoUrl, photoOrder]
      );

      // Check if profile is complete (at least 2 photos)
      const photoCount = await query(
        'SELECT COUNT(*) FROM profile_photos WHERE user_id = $1',
        [userId]
      );

      if (parseInt(photoCount.rows[0].count) >= 2) {
        await query(
          'UPDATE users SET profile_complete = TRUE WHERE id = $1',
          [userId]
        );
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Photo upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.userId;

      const userResult = await query(
        'SELECT id, email, display_name, age, bio, location, interests, is_verified_user, profile_complete FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const photosResult = await query(
        'SELECT photo_url, photo_order FROM profile_photos WHERE user_id = $1 ORDER BY photo_order',
        [userId]
      );

      res.status(200).json({
        ...userResult.rows[0],
        photos: photosResult.rows,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
