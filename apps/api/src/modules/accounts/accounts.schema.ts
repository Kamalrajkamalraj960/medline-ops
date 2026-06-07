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

export const recordPaymentSchema = z.object({
  payerName: z.string().min(2),
  invoiceId: z.string().optional(),
  amount: z.coerce.number().min(0.01),
  method: z.enum(['UPI', 'BANK_TRANSFER', 'CASH', 'ONLINE_GATEWAY', 'CHEQUE', 'CARD']),
  proofUrl: z.string().url().optional(),
  confirmed: z.boolean().optional(), // mark confirmed on creation
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
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type RefundDecisionInput = z.infer<typeof refundDecisionSchema>;
export type ListInput = z.infer<typeof listSchema>;
