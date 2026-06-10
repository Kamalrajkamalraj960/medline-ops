import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '@medline/db';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/http-error.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/jwt.js';

function publicUser(user: {
  id: string; name: string; email: string; username: string | null;
  avatarUrl: string | null; role: { name: string; label: string };
  department: { name: string; label: string } | null;
  permissions: string[];
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role.name,
    roleLabel: user.role.label,
    department: user.department?.name ?? null,
    departmentLabel: user.department?.label ?? null,
    permissions: user.permissions,
  };
}

async function issueTokens(userId: string, meta: { userAgent?: string; ip?: string }) {
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken({ sub: userId, jti });
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      id: jti,
      userId,
      refreshTokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ip,
      expiresAt,
    },
  });

  return refreshToken;
}

async function loadUserContext(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      department: true,
    },
  });
  return {
    ...user,
    permissions: user.role.permissions.map((rp: any) => rp.permission.key),
  };
}

export const authService = {
  async login(identifier: string, password: string, meta: { userAgent?: string; ip?: string }) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }] },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        department: true,
      },
    });

    // Constant-ish failure to avoid leaking which field was wrong.
    if (!user) throw HttpError.unauthorized('Invalid credentials');
    if (user.status === 'SUSPENDED') throw HttpError.forbidden('Account suspended');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw HttpError.unauthorized('Invalid credentials');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = signAccessToken({ sub: user.id, role: user.role.name, email: user.email });
    const refreshToken = await issueTokens(user.id, meta);

    const permissions = user.role.permissions.map((rp: any) => rp.permission.key);
    return {
      accessToken,
      refreshToken,
      user: publicUser({ ...user, permissions }),
    };
  },

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw HttpError.unauthorized('Invalid refresh token');
    }

    const session = await prisma.session.findUnique({ where: { id: payload.jti } });
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    if (
      !session ||
      session.revokedAt ||
      session.refreshTokenHash !== hash ||
      session.expiresAt < new Date()
    ) {
      throw HttpError.unauthorized('Session expired, please log in again');
    }

    const ctx = await loadUserContext(payload.sub);
    const accessToken = signAccessToken({ sub: ctx.id, role: ctx.role.name, email: ctx.email });
    return { accessToken, user: publicUser(ctx) };
  },

  async logout(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await prisma.session.updateMany({
        where: { id: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // already invalid — nothing to revoke
    }
  },

  async me(userId: string) {
    const ctx = await loadUserContext(userId);
    return publicUser(ctx);
  },
};
