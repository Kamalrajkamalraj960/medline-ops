import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import {
  CASE_STAGES, DOCUMENT_CATEGORIES, SUPPORTED_AUTHORITIES,
} from './consultancy.constants.js';
import {
  addDocumentSchema, addFollowUpSchema, authorityUpdateSchema, createCaseSchema,
  listCasesSchema, presignSchema, updateCaseStatusSchema, updateDocumentSchema,
} from './consultancy.schema.js';
import { consultancyService } from './consultancy.service.js';
import { dispatch } from '../automation/automation.engine.js';

const router = Router();

// Reference data for the UI (stages, authorities, document categories).
router.get('/meta', authorize('case:view'), (_req, res) => {
  res.json({ stages: CASE_STAGES, authorities: SUPPORTED_AUTHORITIES, documentCategories: DOCUMENT_CATEGORIES });
});

router.get('/stats', authorize('case:view'), asyncHandler(async (_req, res) => {
  res.json(await consultancyService.stats());
}));

router.get('/', authorize('case:view'), asyncHandler(async (req, res) => {
  res.json(await consultancyService.list(listCasesSchema.parse(req.query)));
}));

router.get('/:id', authorize('case:view'), asyncHandler(async (req, res) => {
  res.json(await consultancyService.get(req.params.id));
}));

router.post('/', authorize('case:create'), validateBody(createCaseSchema), asyncHandler(async (req, res) => {
  const c = await consultancyService.createCase(req.body);
  await audit({ action: 'CASE_CREATED', resource: 'case', resourceId: c.id, newValue: c, req });
  res.status(201).json(c);
}));

router.patch('/:id/status', authorize('case:edit'), validateBody(updateCaseStatusSchema), asyncHandler(async (req, res) => {
  const c = await consultancyService.updateStatus(req.params.id, req.body.status);
  await audit({ action: 'CASE_STATUS_CHANGED', resource: 'case', resourceId: c.id, newValue: { status: req.body.status }, reason: req.body.reason, req });
  res.json(c);
}));

// Documents
router.post('/:id/documents', authorize('document:create'), validateBody(addDocumentSchema), asyncHandler(async (req, res) => {
  const doc = await consultancyService.addDocument(req.params.id, req.body);
  await audit({ action: 'DOCUMENT_ADDED', resource: 'document', resourceId: doc.id, newValue: doc, req });
  res.status(201).json(doc);
}));

// Presigned S3 upload URL for a document (documentation team).
router.post('/documents/:documentId/presign', authorize('document:edit', 'document:create'), validateBody(presignSchema), asyncHandler(async (req, res) => {
  res.json(await consultancyService.presignDocumentUpload(req.params.documentId, req.body.fileName, req.body.contentType));
}));

// Presigned download URL for an uploaded document.
router.get('/documents/:documentId/download', authorize('document:view'), asyncHandler(async (req, res) => {
  res.json(await consultancyService.getDocumentDownloadUrl(req.params.documentId));
}));

router.patch('/documents/:documentId', authorize('document:edit', 'document:approve'), validateBody(updateDocumentSchema), asyncHandler(async (req, res) => {
  const doc = await consultancyService.updateDocument(req.params.documentId, req.body, req.user!.id);
  await audit({ action: 'DOCUMENT_UPDATED', resource: 'document', resourceId: doc.id, newValue: { status: req.body.status }, req });
  if (doc.status === 'VERIFIED') await dispatch('DOCUMENT_VERIFIED', { documentId: doc.id, actorId: req.user!.id, category: doc.category }, req);
  if (doc.status === 'REJECTED') await dispatch('DOCUMENT_REJECTED', { documentId: doc.id, actorId: req.user!.id, category: doc.category }, req);
  res.json(doc);
}));

// Authority tracking
router.patch('/:id/authority', authorize('authority:edit'), validateBody(authorityUpdateSchema), asyncHandler(async (req, res) => {
  const tracking = await consultancyService.updateAuthority(req.params.id, req.body);
  await audit({ action: 'AUTHORITY_UPDATED', resource: 'authority', resourceId: tracking.id, newValue: req.body, req });
  res.json(tracking);
}));

router.post('/:id/follow-ups', authorize('authority:edit'), validateBody(addFollowUpSchema), asyncHandler(async (req, res) => {
  const f = await consultancyService.addFollowUp(req.params.id, req.body);
  res.status(201).json(f);
}));

router.patch('/follow-ups/:followUpId/complete', authorize('authority:edit'), asyncHandler(async (req, res) => {
  res.json(await consultancyService.completeFollowUp(req.params.followUpId));
}));

export default router;
