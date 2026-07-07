const configuredBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

function resolveBaseUrl(): string {
  const fallback = 'http://localhost:3001';
  const base = configuredBase ?? fallback;

  if (typeof window === 'undefined') return base;

  const pageHost = window.location.hostname;
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  if (localHosts.has(pageHost)) return base;

  try {
    const url = new URL(base);
    if (localHosts.has(url.hostname)) {
      url.hostname = pageHost;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    return base;
  }

  return base;
}

const BASE = resolveBaseUrl();
const AUTH_TOKEN_KEY = 'gym_ops_token';

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

// Full-screen lock shown when the backend reports an expired/missing license
// (HTTP 402). Injected once, directly into the DOM, so it covers the app
// regardless of which route or query triggered it.
function showLicenseLock(message: string): void {
  if (typeof document === 'undefined' || document.getElementById('license-lock')) return;
  const el = document.createElement('div');
  el.id = 'license-lock';
  el.setAttribute(
    'style',
    'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
      'background:#0b0b0f;color:#fafafa;font-family:system-ui,sans-serif;text-align:center;padding:24px;',
  );
  el.innerHTML =
    '<div style="max-width:420px"><div style="font-size:40px;margin-bottom:16px">🔒</div>' +
    '<h1 style="font-size:20px;font-weight:600;margin-bottom:8px">Software License Expired</h1>' +
    `<p style="opacity:.7;line-height:1.5">${message}</p></div>`;
  document.body.appendChild(el);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;

  try {
    const token = getAuthToken();
    const headers = new Headers();
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      `Cannot reach the backend API at ${BASE}. Check VITE_API_URL, backend status, and CORS FRONTEND_URL.`,
    );
  }

  // 204 No Content — return undefined
  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) clearAuthToken();

    if (res.status === 402) {
      const msg = (json as { error?: { message?: string } } | null)?.error?.message;
      showLicenseLock(msg ?? 'This software license has expired.');
    }

    const message =
      (json as { error?: { message?: string } } | null)?.error?.message ??
      res.statusText;
    throw new ApiError(res.status, message);
  }

  return (json as { data: T }).data;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body: unknown): Promise<T> => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown): Promise<T> => request<T>('PUT', path, body),
  delete: <T = void>(path: string): Promise<T> => request<T>('DELETE', path),
};
