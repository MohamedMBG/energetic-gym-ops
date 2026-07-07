// Mint a signed license file. VENDOR-ONLY — needs license-private.pem, which
// must never be shipped to the client.
//
// Usage:
//   node scripts/make-license.mjs 2027-07-30
//   node scripts/make-license.mjs 2027-07-30 /path/to/out/license.key
//
// Give the client the produced license.key. Dropping it in backend/ (next to
// package.json) unlocks the app until the date you chose.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, '..', 'backend');

const expires = process.argv[2];
const outPath = process.argv[3] || path.join(backendDir, 'license.key');

if (!expires || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
  console.error('Usage: node scripts/make-license.mjs YYYY-MM-DD [outPath]');
  process.exit(1);
}

const privateKey = fs.readFileSync(path.join(backendDir, 'license-private.pem'), 'utf8');
const signature = crypto.sign('sha256', Buffer.from(expires, 'utf8'), privateKey).toString('base64');

fs.writeFileSync(outPath, JSON.stringify({ expires, signature }, null, 2));
console.log(`License written to ${outPath} (valid through ${expires})`);
