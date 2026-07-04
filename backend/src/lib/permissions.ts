// Module-level permissions — one covers view + manage for that section.
// Owners bypass all checks; roles are gym-scoped combinations of these.
export const PERMISSIONS = [
  'clients',
  'payments',
  'packs',
  'offers',
  'equipment',
  'reports',
  'settings',
  'staff',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
