import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';

/**
 * Guards a route by required permission key(s). SUPER_ADMIN bypasses checks.
 * Pass multiple keys to require ANY of them.
 *
 *   router.post('/', authorize('lead:create'), handler)
 */
export function authorize(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(HttpError.unauthorized());
    if (user.role === 'SUPER_ADMIN') return next();

    const ok = required.some((key) => user.permissions.includes(key));
    if (!ok) {
      return next(HttpError.forbidden(`Missing permission: ${required.join(' | ')}`));
    }
    next();
  };
}

/** Restrict a route to specific role names. */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(HttpError.unauthorized());
    if (user.role === 'SUPER_ADMIN' || roles.includes(user.role)) return next();
    return next(HttpError.forbidden('Role not permitted'));
  };
}
