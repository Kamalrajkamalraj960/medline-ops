import { Router } from 'express';
import { prisma } from '@medline/db';
import { asyncHandler } from '../../lib/async-handler.js';

const router = Router();

/**
 * Executive command-center metrics. This is intentionally simple and
 * read-only; each department dashboard can later add scoped queries.
 */
router.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const isExec = req.user!.role === 'SALES_EXECUTIVE';
    const leadWhere = isExec ? { ownerId: req.user!.id } : {};

    const [totalLeads, converted, students, openTasks, openCases, activeUsers, recentLeads] =
      await Promise.all([
        prisma.lead.count({ where: leadWhere }),
        prisma.lead.count({ where: { ...leadWhere, status: 'CONVERTED' } }),
        prisma.academyStudent.count(),
        prisma.task.count({ where: { status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] } } }),
        prisma.consultancyCase.count({ where: { status: { notIn: ['COMPLETED', 'CLOSED', 'ARCHIVED', 'REJECTED'] } } }),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.lead.findMany({
          where: leadWhere,
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { id: true, reference: true, name: true, serviceType: true, status: true, createdAt: true },
        }),
      ]);

    const conversionRate = totalLeads ? Math.round((converted / totalLeads) * 1000) / 10 : 0;

    res.json({
      kpis: {
        totalLeads,
        convertedLeads: converted,
        conversionRate,
        totalStudents: students,
        pendingTasks: openTasks,
        openCases,
        activeUsers,
      },
      recentLeads,
    });
  }),
);

export default router;
