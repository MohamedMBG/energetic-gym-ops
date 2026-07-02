import { Router, CookieOptions, Request } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, gyms } from '../db/schema';
import { hashPassword, comparePassword } from '../lib/password';
import { signToken } from '../lib/jwt';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { ok, unauthorized, conflict } from '../lib/errors';

const router = Router();

const COOKIE_NAME = 'gym_ops_token';

function isLocalHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

function isLocalRequest(req: Request): boolean {
  const origin = req.get('origin');
  if (!origin) return process.env.NODE_ENV !== 'production';

  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && isLocalHost(url.hostname);
  } catch {
    return false;
  }
}

function cookieOptions(req: Request, includeMaxAge = true): CookieOptions {
  const needsCrossSiteCookie = process.env.NODE_ENV === 'production' || !isLocalRequest(req);
  const options: CookieOptions = {
    httpOnly: true,
    secure: needsCrossSiteCookie,
    sameSite: needsCrossSiteCookie ? 'none' : 'lax',
    path: '/',
  };

  if (includeMaxAge) options.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  return options;
}

const setupSchema = z.object({
  gymName: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/setup — first-time only: create gym + owner account
router.post('/setup', validateBody(setupSchema), async (req, res) => {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    conflict(res, 'Setup already completed. Use /login instead.');
    return;
  }

  const { gymName, email, password } = req.body as z.infer<typeof setupSchema>;

  const gymId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await db.insert(gyms).values({ id: gymId, name: gymName });
  await db.insert(users).values({ id: userId, gymId, email, passwordHash });

  const token = signToken({ userId, gymId });
  res.cookie(COOKIE_NAME, token, cookieOptions(req));
  ok(res, { message: 'Setup complete', token }, 201);
});

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    // same message for missing user and wrong password — avoid user enumeration
    unauthorized(res, 'Invalid email or password');
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    unauthorized(res, 'Invalid email or password');
    return;
  }

  const token = signToken({ userId: user.id, gymId: user.gymId });
  res.cookie(COOKIE_NAME, token, cookieOptions(req));
  ok(res, { message: 'Logged in', token });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions(req, false));
  ok(res, { message: 'Logged out' });
});

// GET /api/auth/me — requires auth cookie
router.get('/me', requireAuth, async (req, res) => {
  const [user] = await db
    .select({ id: users.id, email: users.email, gymId: users.gymId })
    .from(users)
    .where(eq(users.id, req.user.userId));

  if (!user) {
    unauthorized(res);
    return;
  }

  const [gym] = await db.select().from(gyms).where(eq(gyms.id, req.user.gymId));

  ok(res, { user, gym });
});

export default router;
