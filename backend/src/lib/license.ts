import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { machineId } from './machine';

// Disclosed license gate. Disclosed = the client is told in the contract the
// software runs on a time-limited license and locks after the deadline until a
// license file is supplied. Not a hidden kill switch.
//
// Signing is asymmetric (RSA): the vendor holds license-private.pem and mints
// license files with scripts/make-license.mjs; the app ships only the public
// key, so the license cannot be forged on the client's machine.

// Until this date the app runs even with no license file present (delivery /
// demo window). On or after it, a valid non-expired license file is required.
const GRACE_UNTIL = '2026-07-30';

// Resolve from cwd, not __dirname: npm runs both `dev` (tsx, src/) and `start`
// (node dist/) with cwd = the backend package dir, so this is stable across dev
// and the production build. __dirname would point into dist/ after tsc.
const PUBLIC_KEY_PATH = path.join(process.cwd(), 'license-public.pem');
const LICENSE_PATH = process.env.LICENSE_FILE || path.join(process.cwd(), 'license.key');

// Public key ships with the app and never changes — read it once.
const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');

interface LicenseFile {
  expires: string; // YYYY-MM-DD
  machineId?: string; // if set, license only valid on this machine
  signature: string; // base64 over `${expires}|${machineId ?? ''}`
}

// Signed message = expiry + bound machine id. Must match make-license.mjs.
function signedPayload(expires: string, boundMachine: string): string {
  return `${expires}|${boundMachine}`;
}

// Compare YYYY-MM-DD strings lexically — valid because the format is zero-padded.
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface LicenseStatus {
  ok: boolean;
  reason?: string;
  expires?: string;
}

export function checkLicense(): LicenseStatus {
  const today = todayStr();

  let raw: string;
  try {
    raw = fs.readFileSync(LICENSE_PATH, 'utf8');
  } catch {
    // No license file. Allowed only inside the grace window.
    if (today < GRACE_UNTIL) return { ok: true, reason: 'grace' };
    return { ok: false, reason: 'No license file installed. Contact the vendor.' };
  }

  let lic: LicenseFile;
  try {
    lic = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'License file is corrupt.' };
  }

  if (typeof lic.expires !== 'string' || typeof lic.signature !== 'string') {
    return { ok: false, reason: 'License file is malformed.' };
  }

  const boundMachine = typeof lic.machineId === 'string' ? lic.machineId : '';

  // Fail closed: any verify error (bad key, garbage signature) = not licensed,
  // never a 500.
  let verified = false;
  try {
    verified = crypto.verify(
      'sha256',
      Buffer.from(signedPayload(lic.expires, boundMachine), 'utf8'),
      publicKey,
      Buffer.from(lic.signature, 'base64'),
    );
  } catch {
    verified = false;
  }
  if (!verified) return { ok: false, reason: 'License signature invalid.' };

  // Machine-bound license: reject if this isn't the licensed device.
  if (boundMachine && boundMachine !== machineId()) {
    return { ok: false, reason: 'License is not valid for this machine. Contact the vendor.' };
  }

  if (today > lic.expires) {
    return { ok: false, reason: `License expired on ${lic.expires}. Contact the vendor.`, expires: lic.expires };
  }

  return { ok: true, expires: lic.expires };
}
