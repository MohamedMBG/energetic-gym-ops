import path from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { setupLocal } from './setup-local.mjs';

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), '..');
const backendDir = path.join(rootDir, 'backend');
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

function log(message) {
  process.stdout.write(`[dev:local] ${message}\n`);
}

function prefixedPipe(stream, prefix) {
  stream?.on('data', (chunk) => {
    const text = chunk.toString();
    for (const line of text.split(/\r?\n/)) {
      if (line) process.stdout.write(`${prefix}${line}\n`);
    }
  });
}

function startProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? rootDir,
    env: { ...process.env, ...options.env },
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
  });

  prefixedPipe(child.stdout, options.stdoutPrefix ?? '');
  prefixedPipe(child.stderr, options.stderrPrefix ?? options.stdoutPrefix ?? '');

  child.on('exit', (code) => {
    if (code !== null) {
      log(`${options.name ?? command} exited with code ${code}`);
    }
  });

  return child;
}

function killChild(child) {
  if (!child || child.killed) return;
  child.kill('SIGINT');
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function findFrontendPort() {
  for (let port = 5173; port <= 5190; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port)) return port;
  }

  throw new Error('No free frontend port found in the 5173-5190 range.');
}

function getLanAddress() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) return address.address;
    }
  }

  return null;
}

async function main() {
  const backendEnv = await setupLocal();
  const frontendPort = await findFrontendPort();
  const frontendUrl = `http://localhost:${frontendPort}`;
  const lanAddress = getLanAddress();
  const lanFrontendUrl = lanAddress ? `http://${lanAddress}:${frontendPort}` : null;
  const frontendNpm = npmInvocation([
    'run',
    'dev',
    '--',
    '--host',
    '0.0.0.0',
    '--port',
    String(frontendPort),
    '--strictPort',
  ]);
  const backendNpm = npmInvocation(['run', 'dev']);
  let backendProcess;

  const frontendProcess = startProcess(frontendNpm.command, frontendNpm.args, {
    cwd: rootDir,
    name: 'frontend',
    stdoutPrefix: '[frontend] ',
    stderrPrefix: '[frontend] ',
  });

  const shutdown = () => {
    killChild(frontendProcess);
    killChild(backendProcess);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  log(`Starting frontend on ${frontendUrl}`);
  if (lanFrontendUrl) log(`Phone URL on the same Wi-Fi: ${lanFrontendUrl}`);

  backendProcess = startProcess(backendNpm.command, backendNpm.args, {
    cwd: backendDir,
    env: {
      ...backendEnv,
      FRONTEND_URL: frontendUrl,
    },
    name: 'backend',
    stdoutPrefix: '[backend] ',
    stderrPrefix: '[backend] ',
  });

  frontendProcess.on('exit', (code) => {
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(`\n[dev:local] ${error.message}`);
  process.exit(1);
});
