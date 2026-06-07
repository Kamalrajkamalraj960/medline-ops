import { z } from 'zod';

const caseStatusEnum = z.enum([
  'DOCUMENT_COLLECTION', 'VERIFICATION', 'READY_FOR_SUBMISSION', 'SUBMITTED',
  'UNDER_REVIEW', 'ADDITIONAL_DOCS_REQUIRED', 'ELIGIBILITY_RECEIVED', 'EXAM_SCHEDULED',
  'EXAM_PASSED', 'LICENSE_PROCESSING', 'COMPLETED', 'REJECTED', 'CLOSED', 'ARCHIVED',
]);

export const createCaseSchema = z.object({
  // Either start from an existing (converted) lead, or capture inline.
  leadId: z.string().optional(),
  clientName: z.string().min(2).optional(),
  authority: z.string().min(2),
  profession: z.string().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  assignedOfficerId: z.string().optional(),
}).refine((v) => v.leadId || v.clientName, {
  message: 'Provide either leadId or clientName',
});

export const updateCaseStatusSchema = z.object({
  status: caseStatusEnum,
  reason: z.string().optional(),
});

export const listCasesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: caseStatusEnum.optional(),
  authority: z.string().optional(),
  queue: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const addDocumentSchema = z.object({
  category: z.string().min(2),
  // S3 object key (from a presigned upload), not a public URL.
  fileUrl: z.string().min(1).optional(),
});

export const updateDocumentSchema = z.object({
  status: z.enum(['MISSING', 'UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'RESUBMISSION_REQUIRED']),
  fileUrl: z.string().min(1).optional(),
  rejectionReason: z.string().optional(),
});

export const presignSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

export const authorityUpdateSchema = z.object({
  status: z.enum(['NOT_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_DOCS_REQUESTED', 'ELIGIBILITY_ISSUED', 'EXAM_SCHEDULED', 'APPROVED', 'REJECTED', 'CLOSED']),
  referenceNumber: z.string().optional(),
  submissionDate: z.coerce.date().optional(),
});

export const addFollowUpSchema = z.object({
  type: z.enum(['email', 'call', 'portal', 'visit', 'client', 'escalation']),
  dueAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseStatusInput = z.infer<typeof updateCaseStatusSchema>;
export type ListCasesInput = z.infer<typeof listCasesSchema>;
export type AddDocumentInput = z.infer<typeof addDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type AuthorityUpdateInput = z.infer<typeof authorityUpdateSchema>;
export type AddFollowUpInput = z.infer<typeof addFollowUpSchema>;
export type PresignInput = z.infer<typeof presignSchema>;
