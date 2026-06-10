import { Router, type Request } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import {
  createInvoiceSchema, createRefundSchema, listPaymentsSchema, listSchema, recordPaymentSchema,
  refundDecisionSchema, rejectPaymentSchema, updateInvoiceSchema, updatePaymentSchema,
} from './accounts.schema.js';
import { accountsService } from './accounts.service.js';
import { dispatch } from '../automation/automation.engine.js';

const router = Router();

router.get('/stats', authorize('dashboard:view'), asyncHandler(async (_req, res) => {
  res.json(await accountsService.stats());
}));

router.get('/gst', authorize('gst:view'), asyncHandler(async (_req, res) => {
  res.json(await accountsService.gstSummary());
}));

// ---- Authority payments ----
const createAuthorityPaymentSchema = z.object({
  clientName: z.string().min(2),
  authority: z.string().min(2),
  type: z.string().min(1),
  amount: z.coerce.number().min(0),
  paidAt: z.coerce.date().optional(),
  recovered: z.boolean().optional(),
  status: z.enum(['PENDING', 'PAID', 'RECOVERED', 'CANCELLED']).optional(),
  caseId: z.string().optional(),
});
router.get('/authority-payments', authorize('payment:view'), asyncHandler(async (_req, res) => {
  res.json(await accountsService.listAuthorityPayments());
}));
router.post('/authority-payments', authorize('payment:create'), validateBody(createAuthorityPaymentSchema), asyncHandler(async (req, res) => {
  const p = await accountsService.createAuthorityPayment(req.body);
  await audit({ action: 'AUTHORITY_PAYMENT_CREATED', resource: 'payment', resourceId: p.id, newValue: p, req });
  res.status(201).json(p);
}));
router.patch('/authority-payments/:id', authorize('payment:edit'), validateBody(z.object({ status: z.enum(['PENDING', 'PAID', 'RECOVERED', 'CANCELLED']).optional(), recovered: z.boolean().optional() })), asyncHandler(async (req, res) => {
  res.json(await accountsService.updateAuthorityPayment(req.params.id, req.body));
}));

// ---- Account closures ----
router.get('/closures', authorize('invoice:view'), asyncHandler(async (_req, res) => {
  res.json(await accountsService.closures());
}));

// ---- Invoices ----
router.get('/invoices', authorize('invoice:view'), asyncHandler(async (req, res) => {
  res.json(await accountsService.listInvoices(listSchema.parse(req.query)));
}));
router.get('/invoices/:id', authorize('invoice:view'), asyncHandler(async (req, res) => {
  res.json(await accountsService.getInvoice(req.params.id));
}));
router.post('/invoices', authorize('invoice:create'), validateBody(createInvoiceSchema), asyncHandler(async (req, res) => {
  const inv = await accountsService.createInvoice(req.body);
  await audit({ action: 'INVOICE_CREATED', resource: 'invoice', resourceId: inv.id, newValue: inv, req });
  res.status(201).json(inv);
}));
router.patch('/invoices/:id', authorize('invoice:edit'), validateBody(updateInvoiceSchema), asyncHandler(async (req, res) => {
  const inv = await accountsService.updateInvoice(req.params.id, req.body);
  await audit({ action: 'INVOICE_UPDATED', resource: 'invoice', resourceId: inv.id, newValue: req.body, req });
  res.json(inv);
}));

// ---- Payments ----
const actorOf = (req: Request) => ({ id: req.user!.id, name: req.user!.email });

router.get('/payments/stats', authorize('payment:view'), asyncHandler(async (_req, res) => {
  res.json(await accountsService.paymentStats());
}));
router.get('/payments', authorize('payment:view'), asyncHandler(async (req, res) => {
  res.json(await accountsService.listPayments(listPaymentsSchema.parse(req.query)));
}));
router.get('/payments/:id', authorize('payment:view'), asyncHandler(async (req, res) => {
  res.json(await accountsService.getPayment(req.params.id));
}));
router.post('/payments', authorize('payment:create'), validateBody(recordPaymentSchema), asyncHandler(async (req, res) => {
  const p = await accountsService.recordPayment(req.body, actorOf(req));
  await audit({ action: 'PAYMENT_RECORDED', resource: 'payment', resourceId: p.id, newValue: p, req });
  if (p.status === 'CONFIRMED') {
    await dispatch('PAYMENT_CONFIRMED', { paymentId: p.id, actorId: req.user!.id, amount: Number(p.amount), method: p.method }, req);
  }
  res.status(201).json(p);
}));
router.put('/payments/:id', authorize('payment:edit'), validateBody(updatePaymentSchema), asyncHandler(async (req, res) => {
  const p = await accountsService.updatePayment(req.params.id, req.body, actorOf(req));
  await audit({ action: 'PAYMENT_UPDATED', resource: 'payment', resourceId: p.id, newValue: req.body, req });
  res.json(p);
}));
router.delete('/payments/:id', authorize('payment:delete'), asyncHandler(async (req, res) => {
  await accountsService.deletePayment(req.params.id);
  await audit({ action: 'PAYMENT_DELETED', resource: 'payment', resourceId: req.params.id, req });
  res.status(204).end();
}));
router.post('/payments/:id/verify', authorize('payment:edit'), asyncHandler(async (req, res) => {
  const p = await accountsService.verifyPayment(req.params.id, actorOf(req), req.body?.note);
  await audit({ action: 'PAYMENT_VERIFIED', resource: 'payment', resourceId: p.id, req });
  res.json(p);
}));
router.post('/payments/:id/confirm', authorize('payment:edit'), asyncHandler(async (req, res) => {
  const p = await accountsService.confirmPayment(req.params.id, actorOf(req), req.body?.note);
  await audit({ action: 'PAYMENT_CONFIRMED', resource: 'payment', resourceId: p.id, req });
  await dispatch('PAYMENT_CONFIRMED', { paymentId: p.id, actorId: req.user!.id, amount: Number(p.amount), method: p.method }, req);
  res.json(p);
}));
router.post('/payments/:id/reject', authorize('payment:edit'), validateBody(rejectPaymentSchema), asyncHandler(async (req, res) => {
  const p = await accountsService.rejectPayment(req.params.id, actorOf(req), req.body?.reason);
  await audit({ action: 'PAYMENT_REJECTED', resource: 'payment', resourceId: p.id, newValue: { reason: req.body?.reason }, req });
  res.json(p);
}));
// Backward-compatible alias for the existing /payments (ACCOUNTS) screen.
router.patch('/payments/:id/confirm', authorize('payment:edit'), asyncHandler(async (req, res) => {
  const p = await accountsService.confirmPayment(req.params.id, actorOf(req));
  await audit({ action: 'PAYMENT_CONFIRMED', resource: 'payment', resourceId: p.id, req });
  await dispatch('PAYMENT_CONFIRMED', { paymentId: p.id, actorId: req.user!.id, amount: Number(p.amount), method: p.method }, req);
  res.json(p);
}));

// ---- Refunds ----
router.get('/refunds', authorize('refund:view'), asyncHandler(async (_req, res) => {
  res.json(await accountsService.listRefunds());
}));
router.post('/refunds', authorize('refund:view'), validateBody(createRefundSchema), asyncHandler(async (req, res) => {
  const r = await accountsService.createRefund(req.body, req.user!.id);
  await audit({ action: 'REFUND_REQUESTED', resource: 'refund', resourceId: r.id, newValue: r, req });
  res.status(201).json(r);
}));
router.patch('/refunds/:id', authorize('refund:approve'), validateBody(refundDecisionSchema), asyncHandler(async (req, res) => {
  const r = await accountsService.decideRefund(req.params.id, req.body);
  await audit({ action: 'REFUND_DECIDED', resource: 'refund', resourceId: r.id, newValue: req.body, req });
  res.json(r);
}));

export default router;
