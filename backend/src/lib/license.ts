import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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

const PUBLIC_KEY_PATH = path.join(__dirname, '..', '..', 'license-public.pem');
const LICENSE_PATH = process.env.LICENSE_FILE || path.join(__dirname, '..', '..', 'license.key');

interface LicenseFile {
  expires: string; // YYYY-MM-DD
  signature: string; // base64
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

  const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
  const verified = crypto.verify(
    'sha256',
    Buffer.from(lic.expires, 'utf8'),
    publicKey,
    Buffer.from(lic.signature, 'base64'),
  );
  if (!verified) return { ok: false, reason: 'License signature invalid.' };

  if (today > lic.expires) {
    return { ok: false, reason: `License expired on ${lic.expires}. Contact the vendor.`, expires: lic.expires };
  }

  return { ok: true, expires: lic.expires };
}
