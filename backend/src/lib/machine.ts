import crypto from 'node:crypto';
import os from 'node:os';

// Stable-ish hardware fingerprint for this machine. Used to bind a license to
// one device so copying the install to another PC fails verification.
//
// Built from attributes that survive reboots and app reinstalls but differ
// between machines: hostname, first physical MAC, CPU model/count, arch,
// platform. Not a security boundary against a determined attacker (they own the
// box) — it stops casual folder-copy / share-with-a-friend.
let cached: string | null = null;

function firstMac(): string {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        return iface.mac;
      }
    }
  }
  return 'no-mac';
}

export function machineId(): string {
  if (cached) return cached;
  const cpu = os.cpus()[0]?.model ?? 'cpu';
  const parts = [os.hostname(), firstMac(), cpu, String(os.cpus().length), os.platform(), os.arch()];
  cached = crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
  return cached;
}
