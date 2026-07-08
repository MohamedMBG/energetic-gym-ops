import { Request, Response, NextFunction } from 'express';
import { checkLicense } from '../lib/license';
import { trialStatus } from '../lib/trial';

// Re-checked per request so dropping in a license.key takes effect without a
// restart. Order: valid license → allow. No license → free trial window. Bad or
// expired license → locked (no trial fallback).
export async function requireLicense(_req: Request, res: Response, next: NextFunction): Promise<void> {
  const status = checkLicense();
  if (status.ok) {
    next();
    return;
  }

  if (status.noLicense) {
    const trial = await trialStatus();
    if (trial.active) {
      const minsLeft = Math.ceil(trial.msLeft / 60000);
      res.setHeader('X-Trial-Minutes-Left', String(minsLeft));
      next();
      return;
    }
    res.status(402).json({ error: { message: 'Free trial ended. Contact the vendor for a license.' } });
    return;
  }

  res.status(402).json({ error: { message: status.reason ?? 'License required.' } });
}
