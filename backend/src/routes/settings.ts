import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { gyms } from '../db/schema';
import { requireAuth, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { ok, notFound, badRequest } from '../lib/errors';

const router = Router();
router.use(requireAuth);

const updateSettingsSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  monthlyPrice: z.number().min(0).optional(),
  annualPrice: z.number().min(0).optional(),
  reminderDays: z.number().int().min(0).max(60).optional(),
  currency: z.string().min(2).max(8).optional(),
});

type UpdateSettings = z.infer<typeof updateSettingsSchema>;

// GET /api/settings
router.get('/', async (req, res) => {
  const [gym] = await db.select().from(gyms).where(eq(gyms.id, req.user.gymId));

  if (!gym) {
    notFound(res, 'Settings not found');
    return;
  }

  ok(res, gym);
});

// PUT /api/settings
router.put('/', requirePermission('settings'), validateBody(updateSettingsSchema), async (req, res) => {
  const data = req.body as UpdateSettings;

  if (Object.keys(data).length === 0) {
    badRequest(res, 'No fields to update');
    return;
  }

  const [updated] = await db
    .update(gyms)
    .set(data)
    .where(eq(gyms.id, req.user.gymId))
    .returning();

  ok(res, updated);
});

export default router;
