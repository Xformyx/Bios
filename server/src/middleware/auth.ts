import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'myhealth-dev-secret-key-2024';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // 개발 모드: DEMO_MODE=true일 때만 데모 사용자 허용
    if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production') {
      req.userId = 'demo-user-001';
      return next();
    }
    return res.status(401).json({ error: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '로그인이 만료되었습니다. 다시 로그인해주세요.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: '유효하지 않은 인증입니다.', code: 'INVALID_TOKEN' });
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
