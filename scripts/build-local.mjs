// Build the frontend for offline single-machine delivery (Node server + SPA
// prerender). Sets LOCAL_BUILD so vite.config switches off Cloudflare and emits
// a static dist/client the backend exe can serve.
import { execSync } from 'node:child_process';

process.env.LOCAL_BUILD = '1';
execSync('vite build', { stdio: 'inherit' });
