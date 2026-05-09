# Energetic Gym Ops

## Local setup

If PostgreSQL is already installed, one command is enough:

```bash
npm run dev:local
```

What it does:
- installs root and backend dependencies
- creates `backend/.env` if missing
- creates the `energetic_gym_ops` database if it does not exist
- applies the Drizzle schema
- creates the first owner account on a fresh database
- writes the login info to `LOCAL_LOGIN.md`
- starts the frontend and backend dev servers

Defaults:
- frontend API URL: `http://localhost:3001`
- backend port: `3001`
- database name: `energetic_gym_ops`
- postgres user: `postgres`
- owner email: `admin@7upgym.local`
- owner password: `GymOps!2026`

Optional environment variables:
- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `APP_DB_NAME`
- `APP_GYM_NAME`
- `APP_OWNER_EMAIL`
- `APP_OWNER_PASSWORD`
- `PSQL_PATH`
- `PG_BIN`

If you only want the bootstrap step without starting the servers:

```bash
npm run setup:local
```
