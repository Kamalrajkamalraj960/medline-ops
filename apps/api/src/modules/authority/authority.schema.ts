import { z } from 'zod';
import { AUTHORITY_STATUSES } from './authority.constants.js';

const statusEnum = z.enum(AUTHORITY_STATUSES);

export const listAuthoritySchema = z.object({
  search: z.string().optional(),
  authority: z.string().optional(),
  status: z.string().optional(),
});

export const createAuthoritySchema = z.object({
  caseId: z.string().min(1),
  authority: z.string().min(1),
  referenceNumber: z.string().optional(),
  status: statusEnum.optional(),
  submissionDate: z.coerce.date().optional(),
  expectedCompletionDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const updateAuthoritySchema = z.object({
  authority: z.string().min(1).optional(),
  referenceNumber: z.string().optional(),
  submissionDate: z.coerce.date().optional(),
  expectedCompletionDate: z.coerce.date().optional(),
  status: statusEnum.optional(),
  notes: z.string().optional(),
});

export const statusUpdateSchema = z.object({
  status: statusEnum,
  note: z.string().optional(),
});

export const followUpSchema = z.object({
  type: z.string().optional(),
  dueAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const uploadDocumentSchema = z.object({
  category: z.string().min(1),
  fileUrl: z.string().min(1).optional(),
});

export type ListAuthorityInput = z.infer<typeof listAuthoritySchema>;
export type CreateAuthorityInput = z.infer<typeof createAuthoritySchema>;
export type UpdateAuthorityInput = z.infer<typeof updateAuthoritySchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
export type FollowUpInput = z.infer<typeof followUpSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
