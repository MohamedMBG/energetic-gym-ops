import { Response } from 'express';

// Thrown inside transactions or async flows to produce a typed HTTP error response.
// Caught by the global error handler in index.ts.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Wrap any data payload in the standard { data } envelope.
export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

// All error helpers use { error: { message } } shape.
function errorBody(message: string) {
  return { error: { message } };
}

export function badRequest(res: Response, message: string): void {
  res.status(400).json(errorBody(message));
}

export function unauthorized(res: Response, message = 'Unauthorized'): void {
  res.status(401).json(errorBody(message));
}

export function notFound(res: Response, message = 'Not found'): void {
  res.status(404).json(errorBody(message));
}

export function conflict(res: Response, message: string): void {
  res.status(409).json(errorBody(message));
}

export function serverError(res: Response, message = 'Internal server error'): void {
  res.status(500).json(errorBody(message));
}
