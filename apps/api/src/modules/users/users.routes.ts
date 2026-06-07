import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@medline/db';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { HttpError } from '../../lib/http-error.js';

const router = Router();

// Assignable users (sales execs etc.) — used by assignment dropdowns.
router.get(
  '/assignable',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE', role: { name: { in: ['SALES_EXECUTIVE', 'SALES_MANAGER', 'DOCUMENTATION_TEAM'] } } },
      select: { id: true, name: true, role: { select: { name: true, label: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  }),
);

router.get(
  '/',
  authorize('user:view'),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, username: true, status: true, lastLoginAt: true,
        role: { select: { name: true, label: true } },
        department: { select: { name: true, label: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  }),
);

// Roles & departments for the create/edit form selects.
router.get('/options', authorize('user:view'), asyncHandler(async (_req, res) => {
  const [roles, departments] = await Promise.all([
    prisma.role.findMany({ select: { id: true, name: true, label: true }, orderBy: { createdAt: 'asc' } }),
    prisma.department.findMany({ select: { id: true, name: true, label: true }, orderBy: { label: 'asc' } }),
  ]);
  res.json({ roles, departments });
}));

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  username: z.string().min(2).optional(),
  password: z.string().min(4),
  roleId: z.string().min(1),
  departmentId: z.string().optional(),
  phone: z.string().optional(),
});

router.post('/', authorize('user:create', 'user:administer'), validateBody(createUserSchema), asyncHandler(async (req, res) => {
  const exists = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });
  if (exists) throw HttpError.conflict('A user with this email already exists');
  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const user = await prisma.user.create({
    data: {
      name: req.body.name,
      email: req.body.email.toLowerCase(),
      username: req.body.username?.toLowerCase(),
      passwordHash,
      roleId: req.body.roleId,
      departmentId: req.body.departmentId || null,
      phone: req.body.phone,
    },
    select: { id: true, name: true, email: true },
  });
  await audit({ action: 'USER_CREATED', resource: 'user', resourceId: user.id, newValue: { email: user.email }, req });
  res.status(201).json(user);
}));

const updateUserSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INVITED']).optional(),
  roleId: z.string().optional(),
  departmentId: z.string().nullable().optional(),
  password: z.string().min(4).optional(),
});

router.patch('/:id', authorize('user:edit', 'user:administer'), validateBody(updateUserSchema), asyncHandler(async (req, res) => {
  // Guard: never let an admin lock themselves out by suspending their own account.
  if (req.params.id === req.user!.id && req.body.status === 'SUSPENDED') {
    throw HttpError.badRequest('You cannot suspend your own account.');
  }
  const data: Record<string, unknown> = {};
  if (req.body.status) data.status = req.body.status;
  if (req.body.roleId) data.roleId = req.body.roleId;
  if (req.body.departmentId !== undefined) data.departmentId = req.body.departmentId;
  if (req.body.password) data.passwordHash = await bcrypt.hash(req.body.password, 10);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, status: true },
  });
  await audit({ action: 'USER_UPDATED', resource: 'user', resourceId: user.id, newValue: { ...req.body, password: undefined }, req });
  res.json(user);
}));

export default router;
