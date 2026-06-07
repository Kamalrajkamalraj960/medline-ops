import { Router } from 'express';
import { z } from 'zod';
import { prisma, type Prisma } from '@medline/db';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';

const router = Router();

const taskInclude = {
  assignee: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

const listQuery = z.object({
  scope: z.enum(['mine', 'all']).default('all'),
  status: z.string().optional(),
  priority: z.string().optional(),
  department: z.string().optional(),
  search: z.string().optional(),
});

router.get('/', authorize('task:view'), asyncHandler(async (req, res) => {
  const q = listQuery.parse(req.query);
  const where: Prisma.TaskWhereInput = {};

  // Users without assignment rights only ever see their own tasks.
  const canSeeAll = req.user!.role === 'SUPER_ADMIN' || req.user!.permissions.includes('task:assign');
  if (q.scope === 'mine' || !canSeeAll) {
    where.OR = [{ assigneeId: req.user!.id }, { createdById: req.user!.id }];
  }
  if (q.status) where.status = q.status as never;
  if (q.priority) where.priority = q.priority as never;
  if (q.department) where.department = q.department as never;
  if (q.search) where.title = { contains: q.search, mode: 'insensitive' };

  const tasks = await prisma.task.findMany({ where, include: taskInclude, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] });
  res.json(tasks);
}));

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  department: z.enum(['ADMINISTRATION', 'OPERATIONS', 'SALES', 'DOCUMENTATION', 'ACADEMY', 'ACCOUNTS', 'MARKETING']).optional(),
  assigneeId: z.string().optional(),
  dueAt: z.coerce.date().optional(),
});

router.post('/', authorize('task:create', 'task:assign'), validateBody(createSchema), asyncHandler(async (req, res) => {
  const task = await prisma.task.create({
    data: {
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      department: req.body.department,
      assigneeId: req.body.assigneeId || null,
      status: req.body.assigneeId ? 'ASSIGNED' : 'NEW',
      createdById: req.user!.id,
    },
    include: taskInclude,
  });
  await audit({ action: 'TASK_CREATED', resource: 'task', resourceId: task.id, newValue: task, req });
  res.status(201).json(task);
}));

const updateSchema = z.object({
  status: z.enum(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  assigneeId: z.string().nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
});

router.patch('/:id', authorize('task:edit', 'task:assign'), validateBody(updateSchema), asyncHandler(async (req, res) => {
  const data: Prisma.TaskUpdateInput = {};
  if (req.body.status) {
    data.status = req.body.status;
    data.completedAt = req.body.status === 'COMPLETED' ? new Date() : null;
  }
  if (req.body.priority) data.priority = req.body.priority;
  if (req.body.assigneeId !== undefined) data.assignee = req.body.assigneeId ? { connect: { id: req.body.assigneeId } } : { disconnect: true };
  if (req.body.dueAt !== undefined) data.dueAt = req.body.dueAt;

  const task = await prisma.task.update({ where: { id: req.params.id }, data, include: taskInclude });
  await audit({ action: 'TASK_UPDATED', resource: 'task', resourceId: task.id, newValue: req.body, req });
  res.json(task);
}));

export default router;
