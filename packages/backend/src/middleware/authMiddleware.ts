import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/tokenService.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  const payload = TokenService.verifyAccessToken(token);
  if (!payload) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
};
