import { Router } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { equipment } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { ok, notFound } from '../lib/errors';

const router = Router();
router.use(requireAuth);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');
const optionalDate = isoDate.nullable().optional();

const equipmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  status: z.enum(['Operational', 'Maintenance', 'Out of service']).default('Operational'),
  lastMaintenanceDate: optionalDate,
  nextMaintenanceDate: optionalDate,
  repairCost: z.number().min(0).default(0),
  supplierName: z.string().trim().max(120).default(''),
  supplierPhone: z.string().trim().max(40).default(''),
  notes: z.string().trim().max(500).default(''),
});

const updateEquipmentSchema = equipmentSchema.partial();

type EquipmentInput = z.infer<typeof equipmentSchema>;
type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;

router.get('/', async (req, res) => {
  const rows = await db
    .select()
    .from(equipment)
    .where(eq(equipment.gymId, req.user.gymId))
    .orderBy(equipment.createdAt);

  ok(res, rows);
});

router.post('/', validateBody(equipmentSchema), async (req, res) => {
  const data = req.body as EquipmentInput;
  const now = new Date();

  const [item] = await db
    .insert(equipment)
    .values({
      id: crypto.randomUUID(),
      gymId: req.user.gymId,
      ...data,
      lastMaintenanceDate: data.lastMaintenanceDate ?? null,
      nextMaintenanceDate: data.nextMaintenanceDate ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  ok(res, item, 201);
});

router.put('/:id', validateBody(updateEquipmentSchema), async (req, res) => {
  const data = req.body as UpdateEquipmentInput;

  const [updated] = await db
    .update(equipment)
    .set({
      ...data,
      lastMaintenanceDate: data.lastMaintenanceDate === undefined ? undefined : data.lastMaintenanceDate ?? null,
      nextMaintenanceDate: data.nextMaintenanceDate === undefined ? undefined : data.nextMaintenanceDate ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(equipment.id, req.params.id), eq(equipment.gymId, req.user.gymId)))
    .returning();

  if (!updated) {
    notFound(res, 'Equipment not found');
    return;
  }

  ok(res, updated);
});

router.delete('/:id', async (req, res) => {
  const [deleted] = await db
    .delete(equipment)
    .where(and(eq(equipment.id, req.params.id), eq(equipment.gymId, req.user.gymId)))
    .returning({ id: equipment.id });

  if (!deleted) {
    notFound(res, 'Equipment not found');
    return;
  }

  res.status(204).send();
});

export default router;
