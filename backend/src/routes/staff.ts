import { Router } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { users, roles, clients, payments, activityLogs } from '../db/schema';
import { requireAuth, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { hashPassword } from '../lib/password';
import { PERMISSIONS } from '../lib/permissions';
import { ok, notFound, conflict, badRequest } from '../lib/errors';

const router = Router();
router.use(requireAuth, requirePermission('staff'));

const roleSchema = z.object({
  name: z.string().trim().min(2).max(60),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
});
const updateRoleSchema = roleSchema.partial();

const staffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().min(2).max(120),
  roleId: z.string().min(1, 'A role is required'),
});
const updateStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  roleId: z.string().min(1).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

// --- Roles ---

router.get('/roles', async (req, res) => {
  const rows = await db.select().from(roles).where(eq(roles.gymId, req.user.gymId)).orderBy(roles.createdAt);
  ok(res, rows);
});

router.post('/roles', validateBody(roleSchema), async (req, res) => {
  const data = req.body as z.infer<typeof roleSchema>;
  const now = new Date();

  const [role] = await db
    .insert(roles)
    .values({ id: crypto.randomUUID(), gymId: req.user.gymId, ...data, createdAt: now, updatedAt: now })
    .returning();

  ok(res, role, 201);
});

router.put('/roles/:id', validateBody(updateRoleSchema), async (req, res) => {
  const data = req.body as z.infer<typeof updateRoleSchema>;

  const [updated] = await db
    .update(roles)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(roles.id, req.params.id), eq(roles.gymId, req.user.gymId)))
    .returning();

  if (!updated) {
    notFound(res, 'Role not found');
    return;
  }

  ok(res, updated);
});

router.delete('/roles/:id', async (req, res) => {
  const [assigned] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.roleId, req.params.id), eq(users.gymId, req.user.gymId)))
    .limit(1);

  if (assigned) {
    conflict(res, 'Reassign staff off this role before deleting it');
    return;
  }

  const [deleted] = await db
    .delete(roles)
    .where(and(eq(roles.id, req.params.id), eq(roles.gymId, req.user.gymId)))
    .returning({ id: roles.id });

  if (!deleted) {
    notFound(res, 'Role not found');
    return;
  }

  res.status(204).send();
});

// --- Performance ---

// Sums time between each login and its next logout for one staff member's
// events (ascending by time). A login with no matching logout is dropped —
// there's no reliable end time for a session that never closed.
function sumOnlineMinutes(events: { action: string; createdAt: Date }[]): number {
  let minutes = 0;
  let openLogin: Date | null = null;

  for (const event of events) {
    if (event.action === 'login') {
      openLogin = event.createdAt;
    } else if (event.action === 'logout' && openLogin) {
      minutes += (event.createdAt.getTime() - openLogin.getTime()) / 60_000;
      openLogin = null;
    }
  }

  return Math.round(minutes);
}

// One row per staff member (owner included): clients handled, payments collected,
// login activity, and a breakdown of actions taken (records created/updated/deleted).
router.get('/performance', async (req, res) => {
  const staffRows = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email, roleId: users.roleId })
    .from(users)
    .where(eq(users.gymId, req.user.gymId));

  const clientRows = await db
    .select({ staffId: clients.staffId })
    .from(clients)
    .where(eq(clients.gymId, req.user.gymId));

  const paymentRows = await db
    .select({ staffId: payments.staffId, amount: payments.amount, status: payments.status })
    .from(payments)
    .where(eq(payments.gymId, req.user.gymId));

  const activityRows = await db
    .select({ userId: activityLogs.userId, action: activityLogs.action, createdAt: activityLogs.createdAt })
    .from(activityLogs)
    .where(eq(activityLogs.gymId, req.user.gymId))
    .orderBy(activityLogs.createdAt);

  const performance = staffRows.map((staff) => {
    const staffClients = clientRows.filter((c) => c.staffId === staff.id).length;
    const staffPayments = paymentRows.filter((p) => p.staffId === staff.id && p.status === 'Paid');
    const staffActivity = activityRows.filter((a) => a.userId === staff.id);

    const logins = staffActivity.filter((a) => a.action === 'login');
    const actionsBreakdown: Record<string, number> = {};
    for (const event of staffActivity) {
      if (event.action === 'login' || event.action === 'logout') continue;
      actionsBreakdown[event.action] = (actionsBreakdown[event.action] ?? 0) + 1;
    }

    return {
      id: staff.id,
      fullName: staff.fullName,
      email: staff.email,
      isOwner: !staff.roleId,
      clientsHandled: staffClients,
      paymentsCollected: staffPayments.length,
      revenueCollected: staffPayments.reduce((sum, p) => sum + p.amount, 0),
      loginCount: logins.length,
      lastLoginAt: logins.at(-1)?.createdAt ?? null,
      onlineMinutes: sumOnlineMinutes(staffActivity),
      totalActions: Object.values(actionsBreakdown).reduce((sum, n) => sum + n, 0),
      actionsBreakdown,
    };
  });

  ok(res, performance);
});

// --- Staff ---

router.get('/', async (req, res) => {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      roleId: users.roleId,
      roleName: roles.name,
      active: users.active,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.gymId, req.user.gymId))
    .orderBy(users.createdAt);

  ok(res, rows.map((r) => ({ ...r, isOwner: !r.roleId, active: !!r.active })));
});

router.post('/', validateBody(staffSchema), async (req, res) => {
  const { email, password, fullName, roleId } = req.body as z.infer<typeof staffSchema>;

  const [role] = await db.select({ id: roles.id }).from(roles).where(and(eq(roles.id, roleId), eq(roles.gymId, req.user.gymId)));
  if (!role) {
    badRequest(res, 'Role not found');
    return;
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    conflict(res, 'Email already in use');
    return;
  }

  const [staff] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      gymId: req.user.gymId,
      email,
      passwordHash: await hashPassword(password),
      fullName,
      roleId,
    })
    .returning({ id: users.id, email: users.email, fullName: users.fullName, roleId: users.roleId, active: users.active });

  ok(res, { ...staff, isOwner: false, active: !!staff.active }, 201);
});

router.put('/:id', validateBody(updateStaffSchema), async (req, res) => {
  const { password, ...rest } = req.body as z.infer<typeof updateStaffSchema>;

  const [target] = await db
    .select({ id: users.id, roleId: users.roleId })
    .from(users)
    .where(and(eq(users.id, req.params.id), eq(users.gymId, req.user.gymId)));

  if (!target) {
    notFound(res, 'Staff member not found');
    return;
  }
  if (!target.roleId) {
    badRequest(res, 'The owner account cannot be edited here');
    return;
  }

  if (rest.roleId) {
    const [role] = await db.select({ id: roles.id }).from(roles).where(and(eq(roles.id, rest.roleId), eq(roles.gymId, req.user.gymId)));
    if (!role) {
      badRequest(res, 'Role not found');
      return;
    }
  }

  const { active, ...restFields } = rest;

  const [updated] = await db
    .update(users)
    .set({
      ...restFields,
      ...(active !== undefined ? { active: active ? 1 : 0 } : {}),
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    })
    .where(eq(users.id, req.params.id))
    .returning({ id: users.id, email: users.email, fullName: users.fullName, roleId: users.roleId, active: users.active });

  ok(res, { ...updated, isOwner: false, active: !!updated.active });
});

router.delete('/:id', async (req, res) => {
  const [target] = await db
    .select({ id: users.id, roleId: users.roleId })
    .from(users)
    .where(and(eq(users.id, req.params.id), eq(users.gymId, req.user.gymId)));

  if (!target) {
    notFound(res, 'Staff member not found');
    return;
  }
  if (!target.roleId) {
    badRequest(res, 'The owner account cannot be deleted');
    return;
  }

  // unassign this staff's historical records instead of blocking deletion — history stays intact
  await db.update(clients).set({ staffId: null }).where(eq(clients.staffId, req.params.id));
  await db.update(payments).set({ staffId: null }).where(eq(payments.staffId, req.params.id));
  await db.delete(activityLogs).where(eq(activityLogs.userId, req.params.id));
  await db.delete(users).where(eq(users.id, req.params.id));

  res.status(204).send();
});

export default router;
