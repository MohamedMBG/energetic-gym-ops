import { asc } from 'drizzle-orm';
import { db } from '../db';
import { gyms } from '../db/schema';

// Free trial: the app runs unlicensed for TRIAL_MS after first run, then locks
// until a license.key is installed. Anchored to the first gym row's createdAt
// (written on first launch) — durable and can't be reset without wiping the
// client's own data.
export const TRIAL_MS = 2 * 60 * 60 * 1000; // 2 hours

let firstRunAt: number | null = null;

async function getFirstRunAt(): Promise<number | null> {
  if (firstRunAt !== null) return firstRunAt;
  const [row] = await db.select({ createdAt: gyms.createdAt }).from(gyms).orderBy(asc(gyms.createdAt)).limit(1);
  if (!row) return null; // no gym yet (very first request before bootstrap) — treat as just-started
  firstRunAt = row.createdAt.getTime();
  return firstRunAt;
}

export interface TrialStatus {
  active: boolean;
  msLeft: number;
}

export async function trialStatus(): Promise<TrialStatus> {
  const start = await getFirstRunAt();
  if (start === null) return { active: true, msLeft: TRIAL_MS };
  const msLeft = start + TRIAL_MS - Date.now();
  return { active: msLeft > 0, msLeft: Math.max(0, msLeft) };
}
