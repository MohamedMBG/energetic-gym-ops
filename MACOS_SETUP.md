# Running on macOS

Goal: run the app on a MacBook the same way it runs on Windows.

## TL;DR

The **dev workflow** (`npm run dev:local`) is already cross-platform. Almost
nothing needs to change — the code uses `path.join`, auto-picks ports, and the
launcher scripts already branch on `process.platform`. The runtime DB driver is
`node:sqlite` (built-in, no native addon to compile).

The only thing that is **Windows-only** is the packaged single-file deliverable
(`seven-backend.exe` + `start.bat`). That matters only if you ship a
double-click build to a Mac client — not for running it yourself.

So there are two scopes below. Pick the one you need.

---

## Scope A — run it locally on the Mac (dev mode)

This is what `LOCAL_LOGIN.md` describes (frontend on :5173). It already works
on macOS. Steps:

1. **Install Node.js.** Use the **same major version as the Windows machine**
   (check with `node -v` on Windows). Node **24 LTS** is safest — it has
   `node:sqlite` stable with no flag, which the app relies on.
   - `brew install node@24` (or install from nodejs.org).
   - ⚠️ Do **not** use Node < 22.13 / < 24: `node:sqlite`'s `DatabaseSync`
     either doesn't exist or needs `--experimental-sqlite`, and the backend
     imports it with no flag → it will crash on startup. This is the single
     most likely failure on the Mac.

2. **Copy the project** to the Mac (git clone or copy the folder). Do **not**
   copy `node_modules/` or `backend/node_modules/` from Windows — they contain
   platform-specific binaries. Delete them if they came along.

3. **First run** installs deps and creates config:
   ```bash
   cd "energetic-gym-ops"
   npm run dev:local
   ```
   This runs `scripts/start-local.mjs`, which calls `setup-local.mjs` to
   `npm install` in root + `backend/`, write `.env` files, pick free ports, and
   launch both servers. `npm install` in `backend/` will fetch a macOS prebuilt
   of `better-sqlite3` (used only by `drizzle-kit` in dev) — needs internet on
   first run.

4. Open the printed frontend URL (`http://localhost:5173`). Log in with the
   credentials in `LOCAL_LOGIN.md` — that file is **regenerated per machine** by
   setup, so its old `C:\...` database path is cosmetic and gets rewritten.

### Moving existing data across
The database is a single file. To carry data from Windows → Mac, copy
`backend/gym.db` (plus `gym.db-wal` / `gym.db-shm` if present) into the same
`backend/` folder on the Mac. Nothing else stores state.

### What could still bite
- **Node version mismatch** — see step 1. Verify: `node -e "require('node:sqlite')"`
  must not error.
- **Gatekeeper / quarantine** — if you copied a zip, macOS may quarantine files.
  Running from a normal `git clone` avoids this.
- Nothing in `src/` hardcodes `C:\` paths or `.exe` — verified. No app-code
  changes required for dev mode.

---

## Scope B — ship a double-click build to a Mac client (deliverable)

**Status: implemented.** Build the Mac bundle from Windows with:
```bash
npm run make:deliverable:mac
```
Output: `deliverable/` (both binaries + `start.command` + `public/` + `.env` +
`license-public.pem`). Zip and send. Record the login it prints.

### What was changed
1. **`backend/package.json`** — added `package:mac`: builds `node22-macos-arm64`
   **and** `node22-macos-x64` with `--no-bytecode --public`. The no-bytecode flag
   is **required** to cross-build from Windows — pkg's normal bytecode step spawns
   the *target* binary, which can't run on Windows (`spawn UNKNOWN`).
2. **`scripts/make-deliverable.mjs`** — `--mac` flag: copies both binaries, writes
   a `start.command` launcher, Mac-specific `README.txt`.
3. **`package.json`** — `make:deliverable:mac` script.

### How the Mac gotchas are handled (all client-side, at launch)
`start.command` runs, in order:
- `uname -m` → picks arm64 or x64 binary automatically (no "which chip?" guess).
- `xattr -dr com.apple.quarantine` → clears the download/AirDrop quarantine flag.
- `chmod +x` → restores exec bit (lost when zipping on Windows).
- `codesign --force --sign -` → **ad-hoc signs the binary.** Mandatory: macOS
  (especially Apple Silicon) kernel-kills unsigned binaries on launch. Built on
  Windows = unsigned, so it's signed on the client instead. `codesign` ships with
  macOS.

Client still right-clicks → **Open** the first time (Gatekeeper on the `.command`
script itself). Documented in README.txt (EN + FR).

### Machine-bound license
`machine.ts` fingerprint includes `os.platform()` + `os.arch()`, so the Mac
yields its own Machine ID — correct, licenses are per-device. Mint against the
Mac's ID: client reads it at `http://localhost:3001/machine-id`, then
`node scripts/make-license.mjs <expiry> --machine <id>`.

### ⚠️ Not yet verified — must smoke-test on a real Mac before shipping
The build succeeds and files are correct, but **it has never run on macOS.**
Two unknowns can only be closed on a Mac:
- Does `node:sqlite` work inside the no-bytecode pkg binary (i.e. does the DB open)?
- Does the ad-hoc-sign-at-launch flow actually let it start?

Test once: unzip on a Mac, double-click `start.command` (or `./seven-backend-arm64`),
hit `http://localhost:3001/health`. Green = ship. Skipping this = the client is
your first test, and you can't debug a black-box binary remotely.

---

## Summary

| Task | Code change? | Status |
|------|-------------|--------|
| Run dev on Mac (Scope A) | None | Install Node 24, `npm run dev:local` |
| Move data | None | Copy `backend/gym.db` |
| Ship `.command` deliverable (Scope B) | Done — 3 files | Built. **Smoke-test on a Mac before shipping.** |
