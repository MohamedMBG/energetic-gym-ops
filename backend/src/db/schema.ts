import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';

// SQLite schema. Timestamps stored as unix integers (mode: 'timestamp' <-> Date).
// permissions stored as JSON text (SQLite has no array type).
const now = () => new Date();

export const gyms = sqliteTable('gyms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  monthlyPrice: real('monthly_price').notNull().default(45),
  annualPrice: real('annual_price').notNull().default(480),
  reminderDays: integer('reminder_days').notNull().default(7),
  currency: text('currency').notNull().default('MAD'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
});

export const roles = sqliteTable(
  'roles',
  {
    id: text('id').primaryKey(),
    gymId: text('gym_id')
      .notNull()
      .references(() => gyms.id),
    name: text('name').notNull(),
    permissions: text('permissions', { mode: 'json' }).$type<string[]>().notNull().$defaultFn(() => []),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
  },
  (table) => [index('roles_gym_id_idx').on(table.gymId)],
);

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  gymId: text('gym_id')
    .notNull()
    .references(() => gyms.id),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull().default(''),
  // null roleId = Owner: full access, cannot be deactivated/deleted via the app
  roleId: text('role_id').references(() => roles.id),
  active: integer('active').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
});

export const offers = sqliteTable(
  'offers',
  {
    id: text('id').primaryKey(),
    gymId: text('gym_id')
      .notNull()
      .references(() => gyms.id),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    discountPercent: real('discount_percent').notNull().default(0),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    targetSubscriptions: integer('target_subscriptions').notNull().default(0),
    status: text('status').notNull().default('Active'), // 'Active' | 'Paused' | 'Ended'
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
  },
  (table) => [
    index('offers_gym_id_idx').on(table.gymId),
    index('offers_status_idx').on(table.status),
  ],
);

export const subscriptionPlans = sqliteTable(
  'subscription_plans',
  {
    id: text('id').primaryKey(),
    gymId: text('gym_id')
      .notNull()
      .references(() => gyms.id),
    name: text('name').notNull(),
    durationMonths: integer('duration_months').notNull(),
    price: real('price').notNull().default(0),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('Active'), // 'Active' | 'Archived'
    isDefault: integer('is_default').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
  },
  (table) => [
    index('subscription_plans_gym_id_idx').on(table.gymId),
    index('subscription_plans_status_idx').on(table.status),
  ],
);

export const equipment = sqliteTable(
  'equipment',
  {
    id: text('id').primaryKey(),
    gymId: text('gym_id')
      .notNull()
      .references(() => gyms.id),
    name: text('name').notNull(),
    category: text('category').notNull(),
    status: text('status').notNull().default('Operational'), // 'Operational' | 'Maintenance' | 'Out of service'
    lastMaintenanceDate: text('last_maintenance_date'),
    nextMaintenanceDate: text('next_maintenance_date'),
    repairCost: real('repair_cost').notNull().default(0),
    supplierName: text('supplier_name').notNull().default(''),
    supplierPhone: text('supplier_phone').notNull().default(''),
    notes: text('notes').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
  },
  (table) => [
    index('equipment_gym_id_idx').on(table.gymId),
    index('equipment_status_idx').on(table.status),
    index('equipment_next_maintenance_idx').on(table.nextMaintenanceDate),
  ],
);

export const clients = sqliteTable(
  'clients',
  {
    id: text('id').primaryKey(),
    gymId: text('gym_id')
      .notNull()
      .references(() => gyms.id),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    photoUrl: text('photo_url').notNull().default(''), // downscaled JPEG data URL, '' = none
    gender: text('gender').notNull(), // 'Male' | 'Female'
    joinDate: text('join_date').notNull(), // ISO date string
    trainingAccess: text('training_access').notNull().default('Gym & Bodybuilding'), // 'Martial Arts' | 'Gym & Bodybuilding' | 'Both'
    subscriptionType: text('subscription_type').notNull(), // 'Monthly' | 'Annual'
    subscriptionPlanId: text('subscription_plan_id').references(() => subscriptionPlans.id),
    subscriptionDurationMonths: integer('subscription_duration_months').notNull().default(1),
    subscriptionStart: text('subscription_start').notNull(),
    subscriptionEnd: text('subscription_end').notNull(),
    assuranceFee: real('assurance_fee').notNull().default(200),
    assuranceStart: text('assurance_start'),
    assuranceEnd: text('assurance_end'),
    assurancePaymentStatus: text('assurance_payment_status').notNull().default('Unpaid'), // 'Paid' | 'Unpaid'
    offerId: text('offer_id').references(() => offers.id),
    paymentStatus: text('payment_status').notNull(), // 'Paid' | 'Unpaid' | 'Late'
    lastPaymentDate: text('last_payment_date'),
    amountPaid: real('amount_paid').notNull().default(0),
    notes: text('notes').notNull().default(''),
    staffId: text('staff_id').references(() => users.id), // staff member who registered/manages this client
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
  },
  (table) => [
    index('clients_gym_id_idx').on(table.gymId),
    index('clients_full_name_idx').on(table.fullName),
    index('clients_staff_id_idx').on(table.staffId),
  ],
);

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    gymId: text('gym_id')
      .notNull()
      .references(() => gyms.id),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    amount: real('amount').notNull(),
    date: text('date').notNull(), // ISO date string
    periodStart: text('period_start').notNull(),
    periodEnd: text('period_end').notNull(),
    method: text('method').notNull(), // 'Cash' | 'Card' | 'Bank transfer'
    status: text('status').notNull(), // 'Paid' | 'Unpaid'
    staffId: text('staff_id').references(() => users.id), // staff member who collected/recorded this payment
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
  },
  (table) => [
    index('payments_gym_id_idx').on(table.gymId),
    index('payments_client_id_idx').on(table.clientId),
    index('payments_gym_client_idx').on(table.gymId, table.clientId),
    index('payments_staff_id_idx').on(table.staffId),
  ],
);

// Audit trail: one row per staff action (login, logout, record created/updated/deleted).
export const activityLogs = sqliteTable(
  'activity_logs',
  {
    id: text('id').primaryKey(),
    gymId: text('gym_id')
      .notNull()
      .references(() => gyms.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(), // 'login' | 'logout' | 'client_created' | ...
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(now),
  },
  (table) => [
    index('activity_logs_gym_id_idx').on(table.gymId),
    index('activity_logs_user_id_idx').on(table.userId),
    index('activity_logs_gym_user_idx').on(table.gymId, table.userId),
  ],
);

export const reminderLogs = sqliteTable('reminder_logs', {
  id: text('id').primaryKey(),
  gymId: text('gym_id')
    .notNull()
    .references(() => gyms.id),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  sentAt: text('sent_at').notNull(), // ISO datetime string
  dueDate: text('due_date').notNull(), // ISO date string
});
