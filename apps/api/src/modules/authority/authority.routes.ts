import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { AUTHORITIES, AUTHORITY_STATUSES } from './authority.constants.js';
import {
  createAuthoritySchema, followUpSchema, listAuthoritySchema, statusUpdateSchema,
  updateAuthoritySchema, uploadDocumentSchema,
} from './authority.schema.js';
import { authorityService } from './authority.service.js';

const router = Router();

// Reference data for the UI filters/forms.
router.get('/meta', authorize('authority:view'), (_req, res) => {
  res.json({ authorities: AUTHORITIES, statuses: AUTHORITY_STATUSES });
});

router.get('/stats', authorize('authority:view'), asyncHandler(async (_req, res) => {
  res.json(await authorityService.stats());
}));

router.get('/', authorize('authority:view'), asyncHandler(async (req, res) => {
  res.json(await authorityService.list(listAuthoritySchema.parse(req.query)));
}));

router.get('/:id', authorize('authority:view'), asyncHandler(async (req, res) => {
  res.json(await authorityService.get(req.params.id));
}));

router.post('/', authorize('authority:edit'), validateBody(createAuthoritySchema), asyncHandler(async (req, res) => {
  const t = await authorityService.create(req.body, req.user!.id);
  await audit({ action: 'AUTHORITY_TRACKING_CREATED', resource: 'authority', resourceId: t.id, newValue: req.body, req });
  res.status(201).json(t);
}));

router.put('/:id', authorize('authority:edit'), validateBody(updateAuthoritySchema), asyncHandler(async (req, res) => {
  const t = await authorityService.update(req.params.id, req.body);
  await audit({ action: 'AUTHORITY_UPDATED', resource: 'authority', resourceId: t.id, newValue: req.body, req });
  res.json(t);
}));

router.delete('/:id', authorize('authority:edit'), asyncHandler(async (req, res) => {
  await authorityService.remove(req.params.id);
  await audit({ action: 'AUTHORITY_TRACKING_DELETED', resource: 'authority', resourceId: req.params.id, req });
  res.status(204).end();
}));

router.post('/:id/status', authorize('authority:edit'), validateBody(statusUpdateSchema), asyncHandler(async (req, res) => {
  const t = await authorityService.setStatus(req.params.id, req.body);
  await audit({ action: 'AUTHORITY_STATUS_CHANGED', resource: 'authority', resourceId: req.params.id, newValue: req.body, req });
  res.json(t);
}));

router.post('/:id/followup', authorize('authority:edit'), validateBody(followUpSchema), asyncHandler(async (req, res) => {
  const t = await authorityService.addFollowUp(req.params.id, req.body);
  await audit({ action: 'AUTHORITY_FOLLOWUP_ADDED', resource: 'authority', resourceId: req.params.id, newValue: req.body, req });
  res.json(t);
}));

router.post('/:id/upload', authorize('authority:edit'), validateBody(uploadDocumentSchema), asyncHandler(async (req, res) => {
  const t = await authorityService.uploadDocument(req.params.id, req.body);
  await audit({ action: 'AUTHORITY_DOCUMENT_UPLOADED', resource: 'authority', resourceId: req.params.id, newValue: req.body, req });
  res.json(t);
}));

// Generate overdue notifications (called by the dashboard on load; deduped).
router.post('/notify-overdue', authorize('authority:edit'), asyncHandler(async (_req, res) => {
  res.json(await authorityService.notifyOverdue());
}));

export default router;
