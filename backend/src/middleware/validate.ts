import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// Parses and coerces req.body against a Zod schema.
// Replaces req.body with the parsed output so routes get clean typed data.
// Returns 400 { error: { message } } on failure.
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res
        .status(400)
        .json({ error: { message: result.error.errors[0].message } });
      return;
    }
    req.body = result.data;
    next();
  };
}

// Parses req.query against a Zod schema.
// Returns 400 on failure.
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res
        .status(400)
        .json({ error: { message: result.error.errors[0].message } });
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
