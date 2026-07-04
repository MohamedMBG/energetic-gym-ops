import { db } from '../db';
import { activityLogs } from '../db/schema';

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'client_created'
  | 'client_updated'
  | 'client_deleted'
  | 'payment_recorded'
  | 'payment_deleted'
  | 'equipment_created'
  | 'equipment_updated'
  | 'equipment_deleted'
  | 'offer_created'
  | 'offer_updated'
  | 'offer_deleted'
  | 'pack_created'
  | 'pack_updated'
  | 'pack_deleted';

// Fire-and-forget: an activity log failure should never break the request it's logging.
export function logActivity(
  gymId: string,
  userId: string,
  action: ActivityAction,
  entity?: { type: string; id: string },
): void {
  db.insert(activityLogs)
    .values({
      id: crypto.randomUUID(),
      gymId,
      userId,
      action,
      entityType: entity?.type ?? null,
      entityId: entity?.id ?? null,
    })
    .catch((err) => console.error('Failed to log activity', err));
}
