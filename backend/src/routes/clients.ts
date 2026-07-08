import { Router } from 'express';
import { z } from 'zod';
import { eq, and, like } from 'drizzle-orm';
import { db } from '../db';
import { clients } from '../db/schema';
import { requireAuth, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { ok, notFound } from '../lib/errors';
import { logActivity } from '../lib/activity';

const router = Router();
router.use(requireAuth, requirePermission('clients'));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const createClientSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().min(5).max(30),
  email: z.string().email(),
  photoUrl: z.string().max(1_500_000).default(''), // data URL; downscaled client-side
  gender: z.enum(['Male', 'Female']),
  joinDate: isoDate,
  trainingAccess: z.enum(['Martial Arts', 'Gym & Bodybuilding', 'Both']).default('Gym & Bodybuilding'),
  subscriptionType: z.string().min(2).max(100),
  subscriptionPlanId: z.string().uuid().nullable().optional(),
  subscriptionDurationMonths: z.number().int().min(1).max(36).default(1),
  subscriptionStart: isoDate,
  subscriptionEnd: isoDate,
  assuranceFee: z.number().min(0).default(200),
  assuranceStart: isoDate.nullable().optional(),
  assuranceEnd: isoDate.nullable().optional(),
  assurancePaymentStatus: z.enum(['Paid', 'Unpaid']).default('Paid'),
  offerId: z.string().uuid().nullable().optional(),
  paymentStatus: z.enum(['Paid', 'Unpaid', 'Late']),
  lastPaymentDate: isoDate.nullable().optional(),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().max(500).default(''),
});

const updateClientSchema = createClientSchema.partial();

type CreateClient = z.infer<typeof createClientSchema>;
type UpdateClient = z.infer<typeof updateClientSchema>;

// GET /api/clients?search=
router.get('/', async (req, res) => {
  const { gymId } = req.user;
  const search = req.query.search as string | undefined;

  const rows = await db
    .select()
    .from(clients)
    .where(
      search
        ? and(eq(clients.gymId, gymId), like(clients.fullName, `%${search}%`))
        : eq(clients.gymId, gymId),
    )
    .orderBy(clients.createdAt);

  ok(res, rows);
});

// POST /api/clients
router.post('/', validateBody(createClientSchema), async (req, res) => {
  const data = req.body as CreateClient;
  const now = new Date();

  const [client] = await db
    .insert(clients)
    .values({
      id: crypto.randomUUID(),
      gymId: req.user.gymId,
      ...data,
      subscriptionPlanId: data.subscriptionPlanId ?? null,
      assuranceStart: data.assuranceStart ?? null,
      assuranceEnd: data.assuranceEnd ?? null,
      offerId: data.offerId ?? null,
      lastPaymentDate: data.lastPaymentDate ?? null,
      staffId: req.user.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logActivity(req.user.gymId, req.user.userId, 'client_created', { type: 'client', id: client.id });
  ok(res, client, 201);
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  const { gymId } = req.user;

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, req.params.id), eq(clients.gymId, gymId)));

  if (!client) {
    notFound(res, 'Client not found');
    return;
  }

  ok(res, client);
});

// PUT /api/clients/:id
router.put('/:id', validateBody(updateClientSchema), async (req, res) => {
  const data = req.body as UpdateClient;
  const { gymId } = req.user;

  const [existing] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, req.params.id), eq(clients.gymId, gymId)));

  if (!existing) {
    notFound(res, 'Client not found');
    return;
  }

  const [updated] = await db
    .update(clients)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(clients.id, req.params.id), eq(clients.gymId, gymId)))
    .returning();

  logActivity(gymId, req.user.userId, 'client_updated', { type: 'client', id: req.params.id });
  ok(res, updated);
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  const { gymId } = req.user;

  const [deleted] = await db
    .delete(clients)
    .where(and(eq(clients.id, req.params.id), eq(clients.gymId, gymId)))
    .returning({ id: clients.id });

  if (!deleted) {
    notFound(res, 'Client not found');
    return;
  }

  logActivity(gymId, req.user.userId, 'client_deleted', { type: 'client', id: req.params.id });
  res.status(204).send();
});

export default router;
