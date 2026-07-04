import { Router } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { clients, offers } from '../db/schema';
import { requireAuth, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { ok, notFound } from '../lib/errors';
import { logActivity } from '../lib/activity';

const router = Router();
router.use(requireAuth, requirePermission('offers'));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const createOfferSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).default(''),
  discountPercent: z.number().min(0).max(100).default(0),
  startDate: isoDate,
  endDate: isoDate.nullable().optional(),
  targetSubscriptions: z.number().int().min(0).default(0),
  status: z.enum(['Active', 'Paused', 'Ended']).default('Active'),
});

const updateOfferSchema = createOfferSchema.partial();

type CreateOffer = z.infer<typeof createOfferSchema>;
type UpdateOffer = z.infer<typeof updateOfferSchema>;

router.get('/', async (req, res) => {
  const rows = await db
    .select()
    .from(offers)
    .where(eq(offers.gymId, req.user.gymId))
    .orderBy(offers.createdAt);

  ok(res, rows);
});

router.post('/', validateBody(createOfferSchema), async (req, res) => {
  const data = req.body as CreateOffer;
  const now = new Date();

  const [offer] = await db
    .insert(offers)
    .values({
      id: crypto.randomUUID(),
      gymId: req.user.gymId,
      ...data,
      endDate: data.endDate ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logActivity(req.user.gymId, req.user.userId, 'offer_created', { type: 'offer', id: offer.id });
  ok(res, offer, 201);
});

router.put('/:id', validateBody(updateOfferSchema), async (req, res) => {
  const data = req.body as UpdateOffer;

  const [updated] = await db
    .update(offers)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(offers.id, req.params.id), eq(offers.gymId, req.user.gymId)))
    .returning();

  if (!updated) {
    notFound(res, 'Offer not found');
    return;
  }

  logActivity(req.user.gymId, req.user.userId, 'offer_updated', { type: 'offer', id: req.params.id });
  ok(res, updated);
});

router.delete('/:id', async (req, res) => {
  let deleted: { id: string } | undefined;

  await db.transaction(async (tx) => {
    await tx
      .update(clients)
      .set({ offerId: null, updatedAt: new Date() })
      .where(and(eq(clients.offerId, req.params.id), eq(clients.gymId, req.user.gymId)));

    [deleted] = await tx
      .delete(offers)
      .where(and(eq(offers.id, req.params.id), eq(offers.gymId, req.user.gymId)))
      .returning({ id: offers.id });
  });

  if (!deleted) {
    notFound(res, 'Offer not found');
    return;
  }

  logActivity(req.user.gymId, req.user.userId, 'offer_deleted', { type: 'offer', id: req.params.id });
  res.status(204).send();
});

export default router;
