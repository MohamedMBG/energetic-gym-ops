import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { verifyToken, JwtPayload } from '../lib/jwt';
import { unauthorized, forbidden } from '../lib/errors';
import { db } from '../db';
import { users, roles } from '../db/schema';
import { Permission } from '../lib/permissions';

export interface AuthedUser extends JwtPayload {
  isOwner: boolean;
  permissions: Permission[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: AuthedUser;
    }
  }
}

// Fetched fresh per request (not embedded in the JWT) so deactivating a staff
// account or changing their role's permissions takes effect immediately.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
  const token = bearerToken || (req.cookies?.gym_ops_token as string | undefined);

  if (!token) {
    unauthorized(res);
    return;
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    unauthorized(res, 'Invalid or expired session');
    return;
  }

  const [account] = await db
    .select({ active: users.active, roleId: users.roleId })
    .from(users)
    .where(eq(users.id, payload.userId));

  if (!account || !account.active) {
    unauthorized(res, 'Account disabled');
    return;
  }

  if (!account.roleId) {
    req.user = { ...payload, isOwner: true, permissions: [] };
    next();
    return;
  }

  const [role] = await db.select({ permissions: roles.permissions }).from(roles).where(eq(roles.id, account.roleId));
  req.user = { ...payload, isOwner: false, permissions: (role?.permissions ?? []) as Permission[] };
  next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user.isOwner || req.user.permissions.includes(permission)) {
      next();
      return;
    }
    forbidden(res, 'You do not have permission to do this');
  };
}
