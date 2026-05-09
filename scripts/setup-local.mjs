import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), '..');
const backendDir = path.join(rootDir, 'backend');
const backendEnvPath = path.join(backendDir, '.env');
const rootEnvPath = path.join(rootDir, '.env');
const loginInfoPath = path.join(rootDir, 'LOCAL_LOGIN.md');
const isWindows = process.platform === 'win32';

function npmInvocation(args) {
  if (isWindows) {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', `npm ${args.join(' ')}`],
    };
  }

  return {
    command: 'npm',
    args,
  };
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const env = {};
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    env[key] = value;
  }
  return env;
}

function formatEnv(env) {
  return `${Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')}\n`;
}

function sqlEscapeLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function log(message) {
  process.stdout.write(`[setup-local] ${message}\n`);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: { ...process.env, ...options.env },
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    if (options.capture) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(
        `${command} ${args.join(' ')} failed with exit code ${code}${
          stderr ? `\n${stderr.trim()}` : ''
        }`,
      );
      reject(error);
    });
  });
}

function postgresCommandName() {
  return isWindows ? 'psql.exe' : 'psql';
}

function postgresCandidates() {
  const candidates = [];

  if (process.env.PSQL_PATH) candidates.push(process.env.PSQL_PATH);

  if (process.env.PG_BIN) {
    candidates.push(path.join(process.env.PG_BIN, postgresCommandName()));
  }

  candidates.push(postgresCommandName());

  if (isWindows) {
    for (let version = 18; version >= 12; version -= 1) {
      candidates.push(
        path.join(
          'C:\\Program Files\\PostgreSQL',
          String(version),
          'bin',
          'psql.exe',
        ),
      );
    }
  }

  return candidates;
}

async function resolvePsql() {
  for (const candidate of postgresCandidates()) {
    try {
      await run(candidate, ['--version'], { capture: true });
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    'Unable to find psql. Install PostgreSQL client tools or set PSQL_PATH / PG_BIN.',
  );
}

function defaultDatabaseUrl() {
  const username = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || '';
  const host = process.env.PGHOST || 'localhost';
  const port = process.env.PGPORT || '5432';
  const database = process.env.APP_DB_NAME || 'energetic_gym_ops';

  const url = new URL(`postgresql://${host}`);
  url.username = username;
  if (password) url.password = password;
  url.port = port;
  url.pathname = `/${database}`;
  return url.toString();
}

function defaultFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

function backendEnvDefaults() {
  return {
    DATABASE_URL: defaultDatabaseUrl(),
    JWT_SECRET: process.env.JWT_SECRET || 'local-dev-jwt-secret-change-me',
    PORT: process.env.PORT || '3001',
    FRONTEND_URL: defaultFrontendUrl(),
  };
}

function ensureRootEnv() {
  const existing = parseEnvFile(rootEnvPath);
  if (existing.VITE_API_URL) return;

  const next = {
    ...existing,
    VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3001',
  };
  writeFileSync(rootEnvPath, formatEnv(next), 'utf8');
  log('Created root .env');
}

function ensureBackendEnv() {
  const existing = parseEnvFile(backendEnvPath);
  const next = { ...backendEnvDefaults(), ...existing };
  const hadFile = existsSync(backendEnvPath);

  if (
    existing.DATABASE_URL &&
    existing.JWT_SECRET &&
    existing.PORT &&
    existing.FRONTEND_URL
  ) {
    log('Using existing backend/.env');
    return next;
  }

  mkdirSync(path.dirname(backendEnvPath), { recursive: true });
  writeFileSync(backendEnvPath, formatEnv(next), 'utf8');
  log(`${hadFile ? 'Updated' : 'Created'} backend/.env`);
  return next;
}

function adminDatabaseName(databaseUrl) {
  return process.env.PGADMIN_DB || 'postgres';
}

async function ensureDatabase(psqlPath, databaseUrl) {
  const url = new URL(databaseUrl);
  const targetDatabase = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const escapedDatabaseName = targetDatabase.replace(/'/g, "''");
  const adminDb = adminDatabaseName(databaseUrl);
  const env = {};

  if (url.password) env.PGPASSWORD = decodeURIComponent(url.password);

  const baseArgs = [
    '-h',
    url.hostname || 'localhost',
    '-p',
    url.port || '5432',
    '-U',
    decodeURIComponent(url.username || 'postgres'),
    '-d',
    adminDb,
  ];

  const check = await run(
    psqlPath,
    [...baseArgs, '-tAc', `SELECT 1 FROM pg_database WHERE datname = '${escapedDatabaseName}'`],
    { capture: true, env },
  );

  if (check.stdout.trim() === '1') {
    log(`Database "${targetDatabase}" already exists`);
    return;
  }

  await run(psqlPath, [...baseArgs, '-c', `CREATE DATABASE "${targetDatabase.replace(/"/g, '""')}";`], {
    env,
  });
  log(`Created database "${targetDatabase}"`);
}

function defaultOwner() {
  return {
    gymName: process.env.APP_GYM_NAME || '7up Gym',
    email: process.env.APP_OWNER_EMAIL || 'admin@7upgym.local',
    password: process.env.APP_OWNER_PASSWORD || 'GymOps!2026',
  };
}

async function ensureOwnerAccount(psqlPath, databaseUrl) {
  const url = new URL(databaseUrl);
  const env = {};
  const owner = defaultOwner();

  if (url.password) env.PGPASSWORD = decodeURIComponent(url.password);

  const baseArgs = [
    '-h',
    url.hostname || 'localhost',
    '-p',
    url.port || '5432',
    '-U',
    decodeURIComponent(url.username || 'postgres'),
    '-d',
    decodeURIComponent(url.pathname.replace(/^\//, '')),
  ];

  const userCount = await run(
    psqlPath,
    [...baseArgs, '-tAc', 'SELECT COUNT(*) FROM users'],
    { capture: true, env },
  );

  const count = Number.parseInt(userCount.stdout.trim() || '0', 10);
  if (count > 0) {
    if (!existsSync(loginInfoPath)) {
      writeFileSync(
        loginInfoPath,
        [
          '# Local Login',
          '',
          'A user already exists in this database, so the setup script did not create a new one.',
          'Use the credentials that were previously configured for this database.',
          '',
          `Database: ${decodeURIComponent(url.pathname.replace(/^\//, ''))}`,
        ].join('\n'),
        'utf8',
      );
    }
    log('Skipped owner creation because a user already exists');
    return { created: false, owner };
  }

  const { default: bcrypt } = await import(path.join(backendDir, 'node_modules', 'bcryptjs', 'index.js'));
  const gymId = randomUUID();
  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(owner.password, 10);
  const insertSql = `
    INSERT INTO gyms (id, name)
    VALUES ('${sqlEscapeLiteral(gymId)}', '${sqlEscapeLiteral(owner.gymName)}');
    INSERT INTO users (id, gym_id, email, password_hash)
    VALUES (
      '${sqlEscapeLiteral(userId)}',
      '${sqlEscapeLiteral(gymId)}',
      '${sqlEscapeLiteral(owner.email)}',
      '${sqlEscapeLiteral(passwordHash)}'
    );
  `;

  await run(psqlPath, [...baseArgs, '-v', 'ON_ERROR_STOP=1', '-c', insertSql], { env });

  writeFileSync(
    loginInfoPath,
    [
      '# Local Login',
      '',
      `Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`,
      `Email: ${owner.email}`,
      `Password: ${owner.password}`,
      `Gym name: ${owner.gymName}`,
      `Database: ${decodeURIComponent(url.pathname.replace(/^\//, ''))}`,
    ].join('\n'),
    'utf8',
  );

  log(`Created initial owner account (${owner.email})`);
  return { created: true, owner };
}

export async function setupLocal() {
  ensureRootEnv();
  const backendEnv = ensureBackendEnv();
  const psqlPath = await resolvePsql();
  const rootNpm = npmInvocation(['install']);
  const backendNpm = npmInvocation(['install']);
  const pushNpm = npmInvocation(['run', 'db:push']);

  log('Installing root dependencies');
  await run(rootNpm.command, rootNpm.args, { cwd: rootDir });

  log('Installing backend dependencies');
  await run(backendNpm.command, backendNpm.args, { cwd: backendDir });

  log('Ensuring PostgreSQL database exists');
  await ensureDatabase(psqlPath, backendEnv.DATABASE_URL);

  log('Applying database schema');
  await run(pushNpm.command, pushNpm.args, {
    cwd: backendDir,
    env: backendEnv,
  });

  await ensureOwnerAccount(psqlPath, backendEnv.DATABASE_URL);

  log('Local setup complete');
  return backendEnv;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile);

if (isDirectRun) {
  setupLocal().catch((error) => {
    console.error(`\n[setup-local] ${error.message}`);
    process.exit(1);
  });
}
