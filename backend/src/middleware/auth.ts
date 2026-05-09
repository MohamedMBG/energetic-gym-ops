import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';
import { unauthorized } from '../lib/errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.gym_ops_token as string | undefined;

  if (!token) {
    unauthorized(res);
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    unauthorized(res, 'Invalid or expired session');
  }
}
