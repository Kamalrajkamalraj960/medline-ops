import { Router } from 'express';
import { z } from 'zod';
import { prisma, type Prisma } from '@medline/db';
import { asyncHandler } from '../../lib/async-handler.js';
import { validateQuery } from '../../middleware/validate.js';

const router = Router();

// Every authenticated user can read and manage their OWN notifications.
// No extra permission gate — scoping is by userId, never cross-user.

const listQuery = z.object({
  unread: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get('/', validateQuery(listQuery), asyncHandler(async (req, res) => {
  const { unread, limit } = listQuery.parse(req.query);
  const where: Prisma.NotificationWhereInput = { userId: req.user!.id };
  if (unread) where.readAt = null;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
    prisma.notification.count({ where: { userId: req.user!.id, readAt: null } }),
  ]);
  res.json({ items, unreadCount });
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await prisma.notification.count({ where: { userId: req.user!.id, readAt: null } });
  res.json({ count });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  // updateMany scoped to the owner so a user can't mark someone else's as read.
  const result = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ updated: result.count });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ updated: result.count });
}));

export default router;
