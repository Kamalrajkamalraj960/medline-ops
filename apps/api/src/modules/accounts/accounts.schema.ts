import { z } from 'zod';

export const createInvoiceSchema = z.object({
  clientName: z.string().min(2),
  leadId: z.string().optional(),
  amount: z.coerce.number().min(0),
  gstAmount: z.coerce.number().min(0).default(0),
  dueAt: z.coerce.date().optional(),
  issue: z.boolean().optional(), // issue immediately instead of draft
});

export const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED']).optional(),
  dueAt: z.coerce.date().optional(),
});

const PAYMENT_METHODS = ['UPI', 'BANK_TRANSFER', 'CASH', 'CARD', 'ONLINE_GATEWAY', 'STRIPE', 'CHEQUE', 'OTHER'] as const;
const PAYMENT_TYPES = ['CONSULTANCY', 'ACADEMY', 'CRM', 'OTHER'] as const;
const PAYMENT_STATUSES = ['PENDING', 'VERIFIED', 'CONFIRMED', 'REJECTED'] as const;

export const recordPaymentSchema = z.object({
  payerName: z.string().min(2),
  payerId: z.string().optional(),
  invoiceId: z.string().optional(),
  leadId: z.string().optional(),
  studentId: z.string().optional(),
  courseId: z.string().optional(),
  amount: z.coerce.number().min(0.01),
  method: z.enum(PAYMENT_METHODS),
  type: z.enum(PAYMENT_TYPES).default('OTHER'),
  transactionRef: z.string().optional(),
  installmentNumber: z.coerce.number().int().min(1).max(120).optional(),
  notes: z.string().optional(),
  proofUrl: z.string().url().optional().or(z.literal('')),
  paymentDate: z.coerce.date().optional(),
  status: z.enum(PAYMENT_STATUSES).optional(), // initial status; default PENDING
  confirmed: z.boolean().optional(), // legacy shortcut → status CONFIRMED
});

export const updatePaymentSchema = z.object({
  payerName: z.string().min(2).optional(),
  invoiceId: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  studentId: z.string().nullable().optional(),
  courseId: z.string().nullable().optional(),
  amount: z.coerce.number().min(0.01).optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  type: z.enum(PAYMENT_TYPES).optional(),
  transactionRef: z.string().optional(),
  installmentNumber: z.coerce.number().int().min(1).max(120).optional(),
  notes: z.string().optional(),
  proofUrl: z.string().url().optional().or(z.literal('')),
  paymentDate: z.coerce.date().optional(),
});

export const rejectPaymentSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const listPaymentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional(),
});

export const createRefundSchema = z.object({
  clientName: z.string().min(2),
  amount: z.coerce.number().min(0.01),
  reason: z.string().optional(),
});

export const refundDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PROCESSED']),
});

export const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
export type ListPaymentsInput = z.infer<typeof listPaymentsSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type RefundDecisionInput = z.infer<typeof refundDecisionSchema>;
export type ListInput = z.infer<typeof listSchema>;
