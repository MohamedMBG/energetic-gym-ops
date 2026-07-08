import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const backendDir = path.join(rootDir, "backend");
const backendEnvPath = path.join(backendDir, ".env");
const rootEnvPath = path.join(rootDir, ".env");
const loginInfoPath = path.join(rootDir, "LOCAL_LOGIN.md");
const isWindows = process.platform === "win32";

function npmInvocation(args) {
  if (isWindows) {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", `npm ${args.join(" ")}`],
    };
  }

  return {
    command: "npm",
    args,
  };
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const env = {};
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function formatEnv(env) {
  return `${Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
}

function log(message) {
  process.stdout.write(`[setup-local] ${message}\n`);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: { ...process.env, ...options.env },
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    if (options.capture) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(
        `${command} ${args.join(" ")} failed with exit code ${code}${
          stderr ? `\n${stderr.trim()}` : ""
        }`,
      );
      reject(error);
    });
  });
}

function defaultFrontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

function backendEnvDefaults() {
  return {
    DB_FILE: process.env.DB_FILE || path.join(backendDir, "gym.db"),
    JWT_SECRET: process.env.JWT_SECRET || "local-dev-jwt-secret-change-me",
    PORT: process.env.PORT || "3001",
    FRONTEND_URL: defaultFrontendUrl(),
    ADMIN_GYM_NAME: process.env.APP_GYM_NAME || "7up Gym",
    ADMIN_EMAIL: process.env.APP_OWNER_EMAIL || "admin@7upgym.local",
    ADMIN_PASSWORD: process.env.APP_OWNER_PASSWORD || "GymOps!2026",
  };
}

function ensureRootEnv() {
  const existing = parseEnvFile(rootEnvPath);
  if (existing.VITE_API_URL) return;

  const next = {
    ...existing,
    VITE_API_URL: process.env.VITE_API_URL || "http://localhost:3001",
  };
  writeFileSync(rootEnvPath, formatEnv(next), "utf8");
  log("Created root .env");
}

function ensureBackendEnv(overrides = {}) {
  const existing = parseEnvFile(backendEnvPath);
  delete existing.DATABASE_URL;
  const next = { ...backendEnvDefaults(), ...existing, ...overrides };
  const hadFile = existsSync(backendEnvPath);

  if (
    existing.DB_FILE === next.DB_FILE &&
    existing.JWT_SECRET === next.JWT_SECRET &&
    existing.PORT === next.PORT &&
    existing.FRONTEND_URL === next.FRONTEND_URL &&
    existing.ADMIN_EMAIL === next.ADMIN_EMAIL &&
    existing.ADMIN_PASSWORD === next.ADMIN_PASSWORD &&
    !parseEnvFile(backendEnvPath).DATABASE_URL
  ) {
    log("Using existing backend/.env");
    return next;
  }

  mkdirSync(path.dirname(backendEnvPath), { recursive: true });
  writeFileSync(backendEnvPath, formatEnv(next), "utf8");
  log(`${hadFile ? "Updated" : "Created"} backend/.env`);
  return next;
}

function defaultOwner(env = {}) {
  return {
    gymName: env.ADMIN_GYM_NAME || process.env.APP_GYM_NAME || "7up Gym",
    email: env.ADMIN_EMAIL || process.env.APP_OWNER_EMAIL || "admin@7upgym.local",
    password: env.ADMIN_PASSWORD || process.env.APP_OWNER_PASSWORD || "GymOps!2026",
  };
}

function writeLoginInfo(backendEnv) {
  const owner = defaultOwner(backendEnv);

  writeFileSync(
    loginInfoPath,
    [
      "# Local Login",
      "",
      `Frontend: ${backendEnv.FRONTEND_URL || "http://localhost:5173"}`,
      `Email: ${owner.email}`,
      `Password: ${owner.password}`,
      `Gym name: ${owner.gymName}`,
      `Database file: ${backendEnv.DB_FILE}`,
    ].join("\n"),
    "utf8",
  );

  log(`Local login info written (${owner.email})`);
}

export async function setupLocal(overrides = {}) {
  ensureRootEnv();
  const backendEnv = ensureBackendEnv(overrides);
  const rootNpm = npmInvocation(["install"]);
  const backendNpm = npmInvocation(["install"]);

  log("Installing root dependencies");
  await run(rootNpm.command, rootNpm.args, { cwd: rootDir });

  log("Installing backend dependencies");
  await run(backendNpm.command, backendNpm.args, { cwd: backendDir });

  writeLoginInfo(backendEnv);

  log("Local setup complete");
  return backendEnv;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile);

if (isDirectRun) {
  setupLocal().catch((error) => {
    console.error(`\n[setup-local] ${error.message}`);
    process.exit(1);
  });
}
