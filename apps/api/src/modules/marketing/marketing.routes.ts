import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { z } from 'zod';
import {
  createCampaignSchema, createSourceSchema, updateCampaignSchema, updateSourceSchema,
} from './marketing.schema.js';
import { marketingService } from './marketing.service.js';

const router = Router();

// ---- Creative library (gated under campaign permissions) ----
const createCreativeSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
  category: z.string().optional(),
  url: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
const updateCreativeSchema = z.object({
  status: z.enum(['DRAFT', 'APPROVED', 'ARCHIVED']).optional(),
  url: z.string().optional(),
});

router.get('/creatives', authorize('campaign:view'), asyncHandler(async (_req, res) => {
  res.json(await marketingService.listCreatives());
}));
router.post('/creatives', authorize('campaign:create'), validateBody(createCreativeSchema), asyncHandler(async (req, res) => {
  const c = await marketingService.createCreative(req.body);
  await audit({ action: 'CREATIVE_CREATED', resource: 'campaign', resourceId: c.id, newValue: c, req });
  res.status(201).json(c);
}));
router.patch('/creatives/:id', authorize('campaign:edit'), validateBody(updateCreativeSchema), asyncHandler(async (req, res) => {
  res.json(await marketingService.updateCreative(req.params.id, req.body));
}));
router.delete('/creatives/:id', authorize('campaign:edit'), asyncHandler(async (req, res) => {
  await marketingService.deleteCreative(req.params.id);
  res.status(204).send();
}));

router.get('/stats', authorize('analytics:view', 'dashboard:view'), asyncHandler(async (_req, res) => {
  res.json(await marketingService.stats());
}));

// ---- Lead sources ----
router.get('/sources', authorize('lead_source:view'), asyncHandler(async (_req, res) => {
  res.json(await marketingService.listSources());
}));
router.post('/sources', authorize('lead_source:manage'), validateBody(createSourceSchema), asyncHandler(async (req, res) => {
  const s = await marketingService.createSource(req.body);
  await audit({ action: 'LEAD_SOURCE_CREATED', resource: 'lead_source', resourceId: s.id, newValue: s, req });
  res.status(201).json(s);
}));
router.patch('/sources/:id', authorize('lead_source:manage'), validateBody(updateSourceSchema), asyncHandler(async (req, res) => {
  res.json(await marketingService.updateSource(req.params.id, req.body));
}));

// ---- Campaigns ----
router.get('/campaigns', authorize('campaign:view'), asyncHandler(async (_req, res) => {
  res.json(await marketingService.listCampaigns());
}));
router.post('/campaigns', authorize('campaign:create'), validateBody(createCampaignSchema), asyncHandler(async (req, res) => {
  const c = await marketingService.createCampaign(req.body);
  await audit({ action: 'CAMPAIGN_CREATED', resource: 'campaign', resourceId: c.id, newValue: c, req });
  res.status(201).json(c);
}));
router.patch('/campaigns/:id', authorize('campaign:edit'), validateBody(updateCampaignSchema), asyncHandler(async (req, res) => {
  const c = await marketingService.updateCampaign(req.params.id, req.body);
  await audit({ action: 'CAMPAIGN_UPDATED', resource: 'campaign', resourceId: c.id, newValue: req.body, req });
  res.json(c);
}));

export default router;
