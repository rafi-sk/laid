import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';

export class MatchController {
  static async getMatches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      const result = await query(
        `SELECT m.id as match_id, m.created_at,
                u.id, u.display_name, u.age, u.bio,
                (SELECT photo_url FROM profile_photos WHERE user_id = u.id ORDER BY photo_order LIMIT 1) as photo
         FROM matches m
         JOIN users u ON (u.id = m.user1_id OR u.id = m.user2_id) AND u.id != $1
         WHERE m.user1_id = $1 OR m.user2_id = $1
         ORDER BY m.created_at DESC`,
        [userId]
      );

      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Get matches error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async unmatch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { matchId } = req.params;

      await query(
        'DELETE FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
        [matchId, userId]
      );

      res.status(200).json({ message: 'Unmatched successfully' });
    } catch (error) {
      console.error('Unmatch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
