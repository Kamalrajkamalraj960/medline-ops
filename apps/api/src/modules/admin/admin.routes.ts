import { Router } from 'express';
import { z } from 'zod';
import { prisma, type Prisma } from '@medline/db';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

// ---- Roles & permissions ----
router.get('/roles', authorize('role:view'), asyncHandler(async (_req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      permissions: { include: { permission: { select: { key: true, resource: true, action: true } } } },
      _count: { select: { users: true } },
    },
  });
  res.json(
    roles.map((r) => ({
      id: r.id,
      name: r.name,
      label: r.label,
      description: r.description,
      userCount: r._count.users,
      permissions: r.permissions.map((p: any) => p.permission.key).sort(),
    })),
  );
}));

// Distinct resources/actions so the UI can render a matrix.
router.get('/permissions', authorize('role:view'), asyncHandler(async (_req, res) => {
  const perms = await prisma.permission.findMany({ select: { resource: true, action: true } });
  const resources = [...new Set(perms.map((p) => p.resource))].sort();
  const actions = [...new Set(perms.map((p) => p.action))].sort();
  res.json({ resources, actions });
}));

// ---- Audit log ----
const auditQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  resource: z.string().optional(),
  action: z.string().optional(),
  search: z.string().optional(),
});

router.get('/audit', authorize('audit:view'), asyncHandler(async (req, res) => {
  const q = auditQuery.parse(req.query);
  const where: Prisma.AuditLogWhereInput = {};
  if (q.resource) where.resource = q.resource;
  if (q.action) where.action = { contains: q.action, mode: 'insensitive' };
  if (q.search) {
    where.OR = [
      { action: { contains: q.search, mode: 'insensitive' } },
      { resource: { contains: q.search, mode: 'insensitive' } },
      { actor: { name: { contains: q.search, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ items, total, page: q.page, pageSize: q.pageSize, totalPages: Math.ceil(total / q.pageSize) });
}));

// ---- Settings ----
router.get('/settings', authorize('settings:view'), asyncHandler(async (_req, res) => {
  const settings = await prisma.setting.findMany();
  const map: Record<string, unknown> = {};
  for (const s of settings) map[s.key] = s.value;
  res.json(map);
}));

router.put(
  '/settings/:key',
  authorize('settings:manage'),
  validateBody(z.object({ value: z.any() })),
  asyncHandler(async (req, res) => {
    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      update: { value: req.body.value as Prisma.InputJsonValue },
      create: { key: req.params.key, value: req.body.value as Prisma.InputJsonValue },
    });
    await audit({ action: 'SETTING_UPDATED', resource: 'settings', resourceId: setting.key, newValue: req.body.value, req });
    res.json(setting);
  }),
);

export default router;
