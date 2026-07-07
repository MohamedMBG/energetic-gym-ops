import { Request, Response, NextFunction } from 'express';
import { checkLicense } from '../lib/license';

// Re-checked per request (cheap file read + one RSA verify) so dropping in a new
// license.key takes effect without a restart.
export function requireLicense(_req: Request, res: Response, next: NextFunction): void {
  const status = checkLicense();
  if (status.ok) {
    next();
    return;
  }
  // 402 Payment Required — the frontend maps this to the license-locked screen.
  res.status(402).json({ error: { message: status.reason ?? 'License required.' } });
}
