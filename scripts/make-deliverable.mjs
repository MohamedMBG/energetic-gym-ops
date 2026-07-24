// One command to produce a client-ready folder: builds the frontend + backend,
// assembles ONLY the files the client should receive, generates secrets, and
// adds a double-click launcher. Never copies the private key.
//
//   node scripts/make-deliverable.mjs          -> Windows build (seven-backend.exe + start.bat)
//   node scripts/make-deliverable.mjs --mac     -> macOS build   (arm64 + x64 binaries + start.command)
//
// Output: ./deliverable  (zip it and send it)
//
// macOS note: build on a Mac if you can — zipping there preserves the exec bit
// so the client can double-click start.command. Cross-building from Windows
// works, but the client must run `chmod +x start.command seven-backend-*` once
// (documented in README.txt).

import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isMac = process.argv.includes('--mac');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'backend');
const out = path.join(root, 'deliverable');

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });

console.log(`\n[1/4] Building frontend (SPA)...`);
run('npm run build:local', root);

console.log(`\n[2/4] Packaging backend (${isMac ? 'macOS arm64 + x64' : 'Windows x64'})...`);
run(isMac ? 'npm run package:mac' : 'npm run package', backend);

console.log('\n[3/4] Assembling deliverable/...');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

if (isMac) {
  for (const arch of ['arm64', 'x64']) {
    const dest = path.join(out, `seven-backend-${arch}`);
    fs.copyFileSync(path.join(backend, 'dist', `seven-backend-${arch}`), dest);
    fs.chmodSync(dest, 0o755);
  }
} else {
  fs.copyFileSync(path.join(backend, 'dist', 'seven-backend.exe'), path.join(out, 'seven-backend.exe'));
}
fs.copyFileSync(path.join(backend, 'license-public.pem'), path.join(out, 'license-public.pem'));
fs.cpSync(path.join(root, '.output', 'public'), path.join(out, 'public'), { recursive: true });

// Safety: the private key must never leave the vendor machine.
if (fs.existsSync(path.join(out, 'license-private.pem'))) {
  throw new Error('ABORT: private key ended up in deliverable/. Remove it before sending.');
}

const adminEmail = 'owner@gym.local';
const adminPassword = crypto.randomBytes(6).toString('base64url'); // 8-char, meets min length
const jwtSecret = crypto.randomBytes(48).toString('hex');

fs.writeFileSync(
  path.join(out, '.env'),
  `JWT_SECRET=${jwtSecret}\nADMIN_EMAIL=${adminEmail}\nADMIN_PASSWORD=${adminPassword}\n`,
);

if (isMac) {
  // Auto-detect the Mac's chip and launch the matching binary. The binary is
  // built unsigned on Windows; macOS (esp. Apple Silicon) kernel-kills unsigned
  // binaries, so we ad-hoc sign it on the client at first launch (`codesign`
  // ships with macOS). Also strip quarantine + restore the exec bit, both of
  // which the zip transfer can drop.
  const startPath = path.join(out, 'start.command');
  fs.writeFileSync(
    startPath,
    [
      '#!/bin/bash',
      'cd "$(dirname "$0")"',
      'if [ "$(uname -m)" = "arm64" ]; then BIN="./seven-backend-arm64"; else BIN="./seven-backend-x64"; fi',
      'xattr -dr com.apple.quarantine . 2>/dev/null',
      'chmod +x "$BIN" 2>/dev/null',
      '# Ad-hoc sign once (unsigned binaries are killed on Apple Silicon).',
      'codesign --force --sign - "$BIN" 2>/dev/null',
      '( sleep 3; open http://localhost:3001 ) &',
      '"$BIN"',
      '',
    ].join('\n'),
  );
  fs.chmodSync(startPath, 0o755);
} else {
  fs.writeFileSync(
    path.join(out, 'start.bat'),
    [
      '@echo off',
      'cd /d "%~dp0"',
      'start "" /b cmd /c "timeout /t 3 >nul & start http://localhost:3001"',
      'seven-backend.exe',
      'pause',
      '',
    ].join('\r\n'),
  );
}

const readme = isMac
  ? [
      'Seven Up Gym — how to run (macOS)',
      '=================================',
      '',
      '1. Double-click start.command',
      '   (If macOS says it "cannot verify the developer": right-click',
      '    start.command -> Open -> Open. You only do this once.)',
      '2. Your browser opens at http://localhost:3001',
      '3. Log in with the credentials your provider gave you.',
      '',
      "If double-clicking opens a text editor instead of running, open Terminal",
      'in this folder and run once:  chmod +x start.command seven-backend-*',
      '',
      'Your data is saved in gym.db (created on first run).',
      'A backup is written automatically every month into the backups folder.',
      'To back up manually, copy gym.db somewhere safe.',
      '',
      'Keep every file in this folder together. Do not delete license-public.pem or .env.',
      '',
      '--- FR ---',
      '1. Double-cliquez sur start.command (au 1er lancement : clic droit -> Ouvrir).',
      '2. Le navigateur ouvre http://localhost:3001',
      '3. Connectez-vous avec les identifiants fournis.',
      'Vos donnees sont dans gym.db. Une sauvegarde mensuelle est creee dans backups.',
      '',
    ]
  : [
      'Seven Up Gym — how to run',
      '=========================',
      '',
      '1. Double-click start.bat',
      '2. Your browser opens at http://localhost:3001',
      '3. Log in with the credentials your provider gave you.',
      '',
      'Your data is saved in gym.db (created on first run).',
      'A backup is written automatically every month into the backups folder.',
      'To back up manually, copy gym.db somewhere safe.',
      '',
      'Keep every file in this folder together. Do not delete license-public.pem or .env.',
      '',
      '--- FR ---',
      '1. Double-cliquez sur start.bat',
      '2. Le navigateur ouvre http://localhost:3001',
      '3. Connectez-vous avec les identifiants fournis.',
      'Vos donnees sont dans gym.db. Une sauvegarde mensuelle est creee dans backups.',
      '',
    ];
fs.writeFileSync(path.join(out, 'README.txt'), readme.join(isMac ? '\n' : '\r\n'));

console.log('\n[4/4] Done.\n');
console.log(`Deliverable ready: ${out}`);
console.log('Zip this folder and send it.\n');
console.log('=== RECORD THESE — the client logs in with them ===');
console.log(`  Login email:    ${adminEmail}`);
console.log(`  Login password: ${adminPassword}`);
console.log('===================================================\n');
console.log('Reminder: the app runs FREE for 2 hours from first launch, then locks until a');
console.log('license.key is installed. To bind a paid license to their machine, get their');
console.log('Machine ID (console / http://localhost:3001/machine-id) and run:');
console.log('  node scripts/make-license.mjs <expiry-date> --machine <id>\n');
