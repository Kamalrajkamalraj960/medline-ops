import type { NextFunction, Request, Response } from 'express';
import { prisma } from '@medline/db';
import { verifyAccessToken } from '../lib/jwt.js';
import { HttpError } from '../lib/http-error.js';

/**
 * Validates the Bearer access token and attaches the user + flattened
 * permission keys to req.user. Permissions are loaded per-request from the
 * role so revocations take effect immediately (no stale token claims).
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw HttpError.unauthorized('Missing access token');
    }
    const token = header.slice('Bearer '.length);

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw HttpError.unauthorized('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    if (!user || user.status === 'SUSPENDED') {
      throw HttpError.unauthorized('User not active');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.key),
    };
    next();
  } catch (err) {
    next(err);
  }
}
