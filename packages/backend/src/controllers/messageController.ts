import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { query } from '../config/database.js';

export class MessageController {
  static async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { matchId } = req.params;

      // Verify user is part of match
      const matchCheck = await query(
        'SELECT * FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
        [matchId, userId]
      );

      if (matchCheck.rows.length === 0) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      const result = await query(
        `SELECT m.*, u.display_name as sender_name
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.match_id = $1
         ORDER BY m.created_at ASC`,
        [matchId]
      );

      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { matchId } = req.params;
      const { content } = req.body;

      // Verify user is part of match
      const matchCheck = await query(
        'SELECT * FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
        [matchId, userId]
      );

      if (matchCheck.rows.length === 0) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      const result = await query(
        'INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
        [matchId, userId, content]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
