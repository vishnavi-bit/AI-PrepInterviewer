// Shared route helpers: async error forwarding and validated request bodies.
import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { badRequest } from './errors';

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

// Express 5 forwards rejected promises already; this keeps the intent explicit and returns the error to the caller.
export const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Returns the parsed value, or a 400 with the first readable message from the schema.
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const first = result.error.issues[0];
    throw badRequest(first?.message ?? 'Some of the details are not valid.');
  }
  return result.data as z.output<T>;
}
