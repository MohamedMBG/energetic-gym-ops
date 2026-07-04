import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { payments, clients } from '../db/schema';
import { requireAuth, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { ok, notFound, AppError } from '../lib/errors';
import { logActivity } from '../lib/activity';

const router = Router();
router.use(requireAuth, requirePermission('payments'));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const createPaymentSchema = z.object({
  clientId: z.string().uuid(),
  amount: z.number().positive('Amount must be greater than 0'),
  date: isoDate,
  periodStart: isoDate,
  periodEnd: isoDate,
  method: z.enum(['Cash', 'Card', 'Bank transfer']),
  status: z.enum(['Paid', 'Unpaid']),
});

type CreatePayment = z.infer<typeof createPaymentSchema>;

// GET /api/payments?clientId=
router.get('/', async (req, res) => {
  const { gymId } = req.user;
  const clientId = req.query.clientId as string | undefined;

  const rows = await db
    .select()
    .from(payments)
    .where(
      clientId
        ? and(eq(payments.gymId, gymId), eq(payments.clientId, clientId))
        : eq(payments.gymId, gymId),
    )
    .orderBy(payments.date);

  ok(res, rows);
});

// POST /api/payments — wrapped in transaction: verify client, insert payment,
// optionally sync client status. All three ops succeed or all roll back.
router.post('/', validateBody(createPaymentSchema), async (req, res) => {
  const { gymId } = req.user;
  const data = req.body as CreatePayment;

  let createdPayment: typeof payments.$inferSelect | undefined;

  await db.transaction(async (tx) => {
    const [client] = await tx
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, data.clientId), eq(clients.gymId, gymId)));

    if (!client) {
      throw new AppError(404, 'Client not found');
    }

    [createdPayment] = await tx
      .insert(payments)
      .values({ id: crypto.randomUUID(), gymId, staffId: req.user.userId, ...data })
      .returning();

    if (data.status === 'Paid') {
      await tx
        .update(clients)
        .set({
          paymentStatus: 'Paid',
          lastPaymentDate: data.date,
          amountPaid: data.amount,
          updatedAt: new Date(),
        })
        .where(and(eq(clients.id, data.clientId), eq(clients.gymId, gymId)));
    }
  });

  logActivity(gymId, req.user.userId, 'payment_recorded', { type: 'payment', id: createdPayment!.id });
  ok(res, createdPayment!, 201);
});

// GET /api/payments/:id
router.get('/:id', async (req, res) => {
  const { gymId } = req.user;

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, req.params.id), eq(payments.gymId, gymId)));

  if (!payment) {
    notFound(res, 'Payment not found');
    return;
  }

  ok(res, payment);
});

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
  const { gymId } = req.user;

  const [deleted] = await db
    .delete(payments)
    .where(and(eq(payments.id, req.params.id), eq(payments.gymId, gymId)))
    .returning({ id: payments.id });

  if (!deleted) {
    notFound(res, 'Payment not found');
    return;
  }

  logActivity(gymId, req.user.userId, 'payment_deleted', { type: 'payment', id: req.params.id });
  res.status(204).send();
});

export default router;
