import { Router } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { clients, gyms, subscriptionPlans } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { ok, notFound } from '../lib/errors';

const router = Router();
router.use(requireAuth);

const packSchema = z.object({
  name: z.string().trim().min(2).max(100),
  durationMonths: z.number().int().min(1).max(36),
  price: z.number().min(0),
  description: z.string().trim().max(500).default(''),
  status: z.enum(['Active', 'Archived']).default('Active'),
});

const updatePackSchema = packSchema.partial();

type PackInput = z.infer<typeof packSchema>;
type UpdatePackInput = z.infer<typeof updatePackSchema>;

async function ensureDefaultPacks(gymId: string) {
  const existing = await db
    .select({ id: subscriptionPlans.id })
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.gymId, gymId))
    .limit(1);

  if (existing.length > 0) return;

  const [gym] = await db.select().from(gyms).where(eq(gyms.id, gymId));
  const monthlyPrice = gym?.monthlyPrice ?? 250;
  const annualPrice = gym?.annualPrice ?? monthlyPrice * 10;
  const now = new Date();

  await db.insert(subscriptionPlans).values([
    {
      id: crypto.randomUUID(),
      gymId,
      name: 'Monthly',
      durationMonths: 1,
      price: monthlyPrice,
      description: 'Standard one-month subscription.',
      status: 'Active',
      isDefault: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      gymId,
      name: '3 Months',
      durationMonths: 3,
      price: Math.round(monthlyPrice * 3 * 0.9),
      description: 'Three-month discounted package.',
      status: 'Active',
      isDefault: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      gymId,
      name: '6 Months',
      durationMonths: 6,
      price: Math.round(monthlyPrice * 6 * 0.85),
      description: 'Six-month commitment package.',
      status: 'Active',
      isDefault: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      gymId,
      name: 'Yearly',
      durationMonths: 12,
      price: annualPrice,
      description: 'Full-year best-value subscription.',
      status: 'Active',
      isDefault: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      gymId,
      name: 'Summer Pack',
      durationMonths: 3,
      price: Math.round(monthlyPrice * 3 * 0.8),
      description: 'Default summer campaign pack.',
      status: 'Active',
      isDefault: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      gymId,
      name: 'First Year Pack',
      durationMonths: 12,
      price: annualPrice,
      description: 'Default first-year starter package.',
      status: 'Active',
      isDefault: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      gymId,
      name: 'Youngers Pack',
      durationMonths: 1,
      price: Math.round(monthlyPrice * 0.8),
      description: 'Default younger/student-friendly package.',
      status: 'Active',
      isDefault: 1,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

router.get('/', async (req, res) => {
  await ensureDefaultPacks(req.user.gymId);

  const rows = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.gymId, req.user.gymId))
    .orderBy(subscriptionPlans.createdAt);

  ok(res, rows);
});

router.post('/', validateBody(packSchema), async (req, res) => {
  const data = req.body as PackInput;
  const now = new Date();

  const [pack] = await db
    .insert(subscriptionPlans)
    .values({
      id: crypto.randomUUID(),
      gymId: req.user.gymId,
      ...data,
      isDefault: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  ok(res, pack, 201);
});

router.put('/:id', validateBody(updatePackSchema), async (req, res) => {
  const data = req.body as UpdatePackInput;

  const [updated] = await db
    .update(subscriptionPlans)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(subscriptionPlans.id, req.params.id), eq(subscriptionPlans.gymId, req.user.gymId)))
    .returning();

  if (!updated) {
    notFound(res, 'Pack not found');
    return;
  }

  ok(res, updated);
});

router.delete('/:id', async (req, res) => {
  let deleted: { id: string } | undefined;

  await db.transaction(async (tx) => {
    await tx
      .update(clients)
      .set({ subscriptionPlanId: null, updatedAt: new Date() })
      .where(and(eq(clients.subscriptionPlanId, req.params.id), eq(clients.gymId, req.user.gymId)));

    [deleted] = await tx
      .delete(subscriptionPlans)
      .where(and(eq(subscriptionPlans.id, req.params.id), eq(subscriptionPlans.gymId, req.user.gymId)))
      .returning({ id: subscriptionPlans.id });
  });

  if (!deleted) {
    notFound(res, 'Pack not found');
    return;
  }

  res.status(204).send();
});

export default router;
