import { Router } from 'express';
import { authenticate } from './middleware/authenticate.js';
import authRoutes from './modules/auth/auth.routes.js';
import leadsRoutes from './modules/leads/leads.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import consultancyRoutes from './modules/consultancy/consultancy.routes.js';
import academyRoutes from './modules/academy/academy.routes.js';
import accountsRoutes from './modules/accounts/accounts.routes.js';
import marketingRoutes from './modules/marketing/marketing.routes.js';
import portalRoutes from './modules/portal/portal.routes.js';
import automationRoutes from './modules/automation/automation.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import tasksRoutes from './modules/tasks/tasks.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';

const router = Router();

// Public
router.use('/auth', authRoutes);

// Everything below requires a valid access token.
router.use(authenticate);
router.use('/dashboard', dashboardRoutes);
router.use('/leads', leadsRoutes);
router.use('/consultancy', consultancyRoutes);
router.use('/academy', academyRoutes);
router.use('/accounts', accountsRoutes);
router.use('/marketing', marketingRoutes);
router.use('/portal', portalRoutes);
router.use('/automation', automationRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/users', usersRoutes);
router.use('/tasks', tasksRoutes);
router.use('/reports', reportsRoutes);
router.use('/admin', adminRoutes);

export default router;
