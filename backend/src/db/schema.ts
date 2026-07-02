import { pgTable, text, real, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const gyms = pgTable('gyms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  monthlyPrice: real('monthly_price').notNull().default(45),
  annualPrice: real('annual_price').notNull().default(480),
  reminderDays: integer('reminder_days').notNull().default(7),
  currency: text('currency').notNull().default('MAD'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  gymId: text('gym_id')
    .notNull()
    .references(() => gyms.id),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const offers = pgTable(
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
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('offers_gym_id_idx').on(table.gymId),
    index('offers_status_idx').on(table.status),
  ],
);

export const subscriptionPlans = pgTable(
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
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('subscription_plans_gym_id_idx').on(table.gymId),
    index('subscription_plans_status_idx').on(table.status),
  ],
);

export const equipment = pgTable(
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
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('equipment_gym_id_idx').on(table.gymId),
    index('equipment_status_idx').on(table.status),
    index('equipment_next_maintenance_idx').on(table.nextMaintenanceDate),
  ],
);

export const clients = pgTable(
  'clients',
  {
    id: text('id').primaryKey(),
    gymId: text('gym_id')
      .notNull()
      .references(() => gyms.id),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
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
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('clients_gym_id_idx').on(table.gymId),
    index('clients_full_name_idx').on(table.fullName),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: text('id').primaryKey(),
    gymId: text('gym_id')
      .notNull()
      .references(() => gyms.id),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id),
    amount: real('amount').notNull(),
    date: text('date').notNull(), // ISO date string
    periodStart: text('period_start').notNull(),
    periodEnd: text('period_end').notNull(),
    method: text('method').notNull(), // 'Cash' | 'Card' | 'Bank transfer'
    status: text('status').notNull(), // 'Paid' | 'Unpaid'
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('payments_gym_id_idx').on(table.gymId),
    index('payments_client_id_idx').on(table.clientId),
    index('payments_gym_client_idx').on(table.gymId, table.clientId),
  ],
);

export const reminderLogs = pgTable('reminder_logs', {
  id: text('id').primaryKey(),
  gymId: text('gym_id')
    .notNull()
    .references(() => gyms.id),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id),
  email: text('email').notNull(),
  sentAt: text('sent_at').notNull(), // ISO datetime string
  dueDate: text('due_date').notNull(), // ISO date string
});
