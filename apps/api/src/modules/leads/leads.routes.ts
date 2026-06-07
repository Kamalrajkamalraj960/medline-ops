import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { createLeadSchema, listLeadsSchema, updateLeadSchema } from './leads.schema.js';
import { leadsService } from './leads.service.js';
import { dispatch } from '../automation/automation.engine.js';

const router = Router();

router.get(
  '/stats',
  authorize('lead:view'),
  asyncHandler(async (req, res) => {
    // Sales executives only see their own pipeline.
    const ownerId = req.user!.role === 'SALES_EXECUTIVE' ? req.user!.id : undefined;
    res.json(await leadsService.stats(ownerId));
  }),
);

router.get(
  '/',
  authorize('lead:view'),
  asyncHandler(async (req, res) => {
    const query = listLeadsSchema.parse(req.query);
    if (req.user!.role === 'SALES_EXECUTIVE') query.ownerId = req.user!.id;
    res.json(await leadsService.list(query));
  }),
);

router.post(
  '/check-duplicates',
  authorize('lead:create'),
  validateBody(
    z.object({
      phone: z.string().optional(),
      email: z.string().optional(),
      passport: z.string().optional(),
      nationalId: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.json({ duplicates: await leadsService.checkDuplicates(req.body) });
  }),
);

router.get(
  '/:id',
  authorize('lead:view'),
  asyncHandler(async (req, res) => {
    res.json(await leadsService.get(req.params.id));
  }),
);

router.post(
  '/',
  authorize('lead:create'),
  validateBody(createLeadSchema),
  asyncHandler(async (req, res) => {
    const lead = await leadsService.create(req.body, req.user!.id);
    await audit({ action: 'LEAD_CREATED', resource: 'lead', resourceId: lead.id, newValue: lead, req });
    await dispatch('LEAD_CREATED', {
      leadId: lead.id, ownerId: lead.ownerId, actorId: req.user!.id,
      name: lead.name, serviceType: lead.serviceType, priority: lead.priority, status: lead.status,
    }, req);
    res.status(201).json(lead);
  }),
);

router.patch(
  '/:id',
  authorize('lead:edit'),
  validateBody(updateLeadSchema),
  asyncHandler(async (req, res) => {
    const before = await leadsService.get(req.params.id);
    const lead = await leadsService.update(req.params.id, req.body);
    await audit({ action: 'LEAD_UPDATED', resource: 'lead', resourceId: lead.id, oldValue: before, newValue: lead, req });
    await dispatch('CASE_STATUS_CHANGED', { leadId: lead.id, ownerId: lead.ownerId, actorId: req.user!.id, status: lead.status, serviceType: lead.serviceType }, req);
    if (lead.status === 'CONVERTED' && before.status !== 'CONVERTED') {
      await dispatch('LEAD_CONVERTED', { leadId: lead.id, ownerId: lead.ownerId, actorId: req.user!.id, serviceType: lead.serviceType }, req);
    }
    res.json(lead);
  }),
);

router.post(
  '/:id/assign',
  authorize('lead:assign'),
  validateBody(z.object({ ownerId: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const lead = await leadsService.assign(req.params.id, req.body.ownerId);
    await audit({ action: 'LEAD_ASSIGNED', resource: 'lead', resourceId: lead.id, newValue: { ownerId: req.body.ownerId }, req });
    await dispatch('LEAD_ASSIGNED', { leadId: lead.id, ownerId: lead.ownerId, actorId: req.user!.id, serviceType: lead.serviceType }, req);
    res.json(lead);
  }),
);

router.delete(
  '/:id',
  authorize('lead:delete'),
  asyncHandler(async (req, res) => {
    await leadsService.remove(req.params.id);
    await audit({ action: 'LEAD_DELETED', resource: 'lead', resourceId: req.params.id, req });
    res.status(204).send();
  }),
);

export default router;
