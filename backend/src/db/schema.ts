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
    subscriptionType: text('subscription_type').notNull(), // 'Monthly' | 'Annual'
    subscriptionStart: text('subscription_start').notNull(),
    subscriptionEnd: text('subscription_end').notNull(),
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
