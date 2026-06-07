import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { requireRole } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { portalService } from './portal.service.js';

const router = Router();

// The entire portal is restricted to CLIENT accounts.
router.use(requireRole('CLIENT'));

router.get('/overview', asyncHandler(async (req, res) => {
  res.json(await portalService.overview(req.user!.id));
}));

router.get('/documents', asyncHandler(async (req, res) => {
  res.json(await portalService.documents(req.user!.id));
}));

// Step 1: get a presigned PUT URL (the browser uploads directly to S3).
router.post(
  '/documents/:id/presign',
  validateBody(z.object({ fileName: z.string().min(1), contentType: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    res.json(await portalService.presignUpload(req.user!.id, req.params.id, req.body.fileName, req.body.contentType));
  }),
);

// Step 2: record the uploaded object key against the document.
router.post(
  '/documents/:id/upload',
  validateBody(z.object({ fileUrl: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const doc = await portalService.uploadDocument(req.user!.id, req.params.id, req.body.fileUrl);
    await audit({ action: 'CLIENT_DOCUMENT_UPLOADED', resource: 'document', resourceId: doc.id, req });
    res.json(doc);
  }),
);

// Presigned download URL for viewing an uploaded document.
router.get(
  '/documents/:id/download',
  asyncHandler(async (req, res) => {
    res.json(await portalService.getDownloadUrl(req.user!.id, req.params.id));
  }),
);

router.get('/payments', asyncHandler(async (req, res) => {
  res.json(await portalService.payments(req.user!.id));
}));

router.post(
  '/support',
  validateBody(z.object({ subject: z.string().min(2), message: z.string().min(2) })),
  asyncHandler(async (req, res) => {
    const task = await portalService.createSupportRequest(req.user!.id, req.body.subject, req.body.message);
    await audit({ action: 'CLIENT_SUPPORT_REQUEST', resource: 'task', resourceId: task.id, req });
    res.status(201).json(task);
  }),
);

export default router;
