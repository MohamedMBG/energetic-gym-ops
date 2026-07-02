import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { gyms, users } from '../db/schema';
import { hashPassword } from './password';

function adminConfig() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email && !password) return null;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set together');
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  return {
    email,
    password,
    gymName: process.env.ADMIN_GYM_NAME?.trim() || 'Admin Gym',
  };
}

export async function ensureAdminAccount() {
  const config = adminConfig();
  if (!config) return;

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, config.email));
  if (existingUser) {
    console.log(`Admin account already exists (${config.email})`);
    return;
  }

  const [existingGym] = await db.select({ id: gyms.id }).from(gyms).limit(1);
  const gymId = existingGym?.id || randomUUID();

  if (!existingGym) {
    await db.insert(gyms).values({ id: gymId, name: config.gymName });
  }

  await db.insert(users).values({
    id: randomUUID(),
    gymId,
    email: config.email,
    passwordHash: await hashPassword(config.password),
  });

  console.log(`Created admin account (${config.email})`);
}
