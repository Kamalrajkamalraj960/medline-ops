import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

/** Parses and replaces req.body with the validated, typed result. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(result.error);
    // Express 4 query is read-only-ish; stash the parsed version.
    (req as Request & { validatedQuery?: T }).validatedQuery = result.data;
    next();
  };
}
