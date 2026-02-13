import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';

export class DiscoveryController {
  static async getDiscoveryFeed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      // Get users not already swiped, not self, with complete profiles
      const result = await query(
        `SELECT u.id, u.display_name, u.age, u.bio, u.location, u.interests,
                ARRAY_AGG(pp.photo_url ORDER BY pp.photo_order) as photos
         FROM users u
         LEFT JOIN profile_photos pp ON u.id = pp.user_id
         WHERE u.id != $1
         AND u.profile_complete = TRUE
         AND u.is_suspended = FALSE
         AND u.id NOT IN (
           SELECT swiped_id FROM swipes WHERE swiper_id = $1
         )
         GROUP BY u.id
         LIMIT 20`,
        [userId]
      );

      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Discovery feed error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async swipe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { swipedId, direction } = req.body;

      // Record swipe
      await query(
        'INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES ($1, $2, $3)',
        [userId, swipedId, direction]
      );

      // Check for match if right swipe
      if (direction === 'right') {
        const matchCheck = await query(
          'SELECT * FROM swipes WHERE swiper_id = $1 AND swiped_id = $2 AND direction = $3',
          [swipedId, userId, 'right']
        );

        if (matchCheck.rows.length > 0) {
          // Create match
          const [user1, user2] = [userId!, swipedId].sort();
          await query(
            'INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [user1, user2]
          );

          res.status(200).json({ match: true, matchedUserId: swipedId });
          return;
        }
      }

      res.status(200).json({ match: false });
    } catch (error) {
      console.error('Swipe error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
