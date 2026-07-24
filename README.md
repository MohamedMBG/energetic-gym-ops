# Energetic Gym Ops

Gym management system. React + Vite frontend, Express + SQLite backend.
Runs entirely on one machine — no database server to install.

---

## Run it on a MacBook

Everything below is copy-paste. Takes ~5 minutes on first run.

### 1. Install Node.js 24

Open **Terminal** (Spotlight → type `Terminal`) and check what you have:

```bash
node -v
```

You need **v24.x** (or at minimum v22.13). Older versions crash on startup —
the backend uses Node's built-in `node:sqlite`, which is not stable before then.

If Node is missing or too old:

```bash
# with Homebrew (recommended)
brew install node@24
brew link --overwrite --force node@24
```

No Homebrew? Install it first with the command from [brew.sh](https://brew.sh),
or download the Node 24 `.pkg` installer from [nodejs.org](https://nodejs.org).

Verify:

```bash
node -v                             # must print v24.x
node -e "require('node:sqlite')"    # must print nothing (no error)
```

### 2. Get the code

```bash
git clone <repository-url>
cd energetic-gym-ops
```

Downloaded a ZIP from GitHub instead? Unzip it, then clear the macOS download
quarantine flag before running anything:

```bash
xattr -dr com.apple.quarantine .
```

> If you copied the folder from a Windows machine rather than cloning, delete
> `node_modules/` and `backend/node_modules/` first — they hold Windows binaries.

### 3. Start the system

```bash
npm run dev:local
```

One command does all of it:

- installs dependencies (root + `backend/`) — needs internet the first time
- creates `.env` and `backend/.env` if missing
- creates the SQLite database at `backend/gym.db`
- applies the database schema
- creates the first owner account on a fresh database
- writes the login details to `LOCAL_LOGIN.md`
- picks free ports and starts both servers

### 4. Log in

Open the frontend URL printed in the terminal — usually
<http://localhost:5173>.

| | |
|---|---|
| Email | `admin@7upgym.local` |
| Password | `GymOps!2026` |
| Gym name | `7up Gym` |

The exact values for your machine are always in `LOCAL_LOGIN.md`, regenerated
on every setup.

**Change the password after the first login.**

To stop the servers: `Ctrl+C` in the terminal.
To start again later: `cd` into the folder and `npm run dev:local`.

---

## License / free trial

The app runs unlicensed for a **2-hour free trial**, timed from first launch.
After that every `/api` route returns
`Free trial ended. Contact the vendor for a license.` and the UI stops loading
data.

To unlock, the vendor needs your **Machine ID** — the license is bound to one
device. With the backend running:

```bash
curl http://localhost:3001/machine-id
```

Send that ID to the vendor. They return a `license.key` file — drop it into the
`backend/` folder and restart. No restart of the whole machine needed.

---

## Common problems on macOS

| Symptom | Fix |
|---|---|
| `Cannot find module 'node:sqlite'` or `DatabaseSync is not a constructor` | Node too old. Install Node 24 (step 1). |
| `command not found: npm` | Node not installed or not on `PATH`. Reopen Terminal after installing. |
| `EACCES` / permission errors during install | Do not use `sudo npm`. Reinstall Node via Homebrew. |
| `killed` / `damaged and can't be opened` | Quarantine flag. Run `xattr -dr com.apple.quarantine .` in the project folder. |
| Port already in use | The launcher auto-picks a free port; read the URL it prints rather than assuming 5173. |
| Blank page, API errors in console | Backend failed to start. Scroll up in the terminal for its error. |

---

## Moving existing data

The whole database is one file. To carry data between machines, copy
`backend/gym.db` (plus `gym.db-wal` and `gym.db-shm` if they exist) into
`backend/` on the new machine. Nothing else stores state.

---

## Configuration (optional)

Defaults are fine for normal use. Override by exporting before `npm run dev:local`:

| Variable | Default |
|---|---|
| `PORT` | `3001` (backend; auto-shifts if taken) |
| `DB_FILE` | `backend/gym.db` |
| `APP_GYM_NAME` | `7up Gym` |
| `APP_OWNER_EMAIL` | `admin@7upgym.local` |
| `APP_OWNER_PASSWORD` | `GymOps!2026` |
| `LICENSE_FILE` | `backend/license.key` |

Example:

```bash
APP_GYM_NAME="My Gym" APP_OWNER_EMAIL="me@example.com" npm run dev:local
```

---

## Other commands

```bash
npm run setup:local            # bootstrap only, do not start servers
npm run build:local            # production build
npm run make:deliverable:mac   # package a double-click macOS build (vendor only)
npm run lint
```

Windows works the same way — `npm run dev:local`, or double-click
`START_SYSTEM.bat`.

For packaging and shipping details, see [MACOS_SETUP.md](MACOS_SETUP.md).
