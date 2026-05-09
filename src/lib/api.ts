const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

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
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content — return undefined
  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
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
