// Mint a signed license file. VENDOR-ONLY — needs license-private.pem, which
// must never be shipped to the client.
//
// Usage:
//   node scripts/make-license.mjs 2027-07-30
//   node scripts/make-license.mjs 2027-07-30 --machine <machine-id>
//   node scripts/make-license.mjs 2027-07-30 --machine <machine-id> --out /path/license.key
//
// --machine binds the license to one device. The client reads their machine id
// from the app (printed on startup, or GET /machine-id) and sends it to you;
// the resulting license.key then only works on that machine. Omit it for an
// unbound license that runs anywhere (e.g. an internal/demo build).

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, '..', 'backend');

const argv = process.argv.slice(2);
const expires = argv[0];
const machine = readFlag(argv, '--machine') ?? '';
const outPath = readFlag(argv, '--out') || path.join(backendDir, 'license.key');

function readFlag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

if (!expires || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
  console.error('Usage: node scripts/make-license.mjs YYYY-MM-DD [--machine <id>] [--out <path>]');
  process.exit(1);
}

// Must match signedPayload() in backend/src/lib/license.ts.
const payload = `${expires}|${machine}`;
const privateKey = fs.readFileSync(path.join(backendDir, 'license-private.pem'), 'utf8');
const signature = crypto.sign('sha256', Buffer.from(payload, 'utf8'), privateKey).toString('base64');

const license = machine ? { expires, machineId: machine, signature } : { expires, signature };
fs.writeFileSync(outPath, JSON.stringify(license, null, 2));
console.log(`License written to ${outPath}`);
console.log(`  valid through: ${expires}`);
console.log(`  bound machine: ${machine || '(any)'}`);
