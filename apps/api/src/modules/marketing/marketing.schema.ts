import { z } from 'zod';

// Campaign service type honours the global rule: consultancy | academy only.
const serviceTypeEnum = z.enum(['consultancy', 'academy'], {
  errorMap: () => ({ message: "serviceType must be 'consultancy' or 'academy' ('both' is not allowed)" }),
});

export const createSourceSchema = z.object({
  name: z.string().min(2),
  channel: z.string().optional(),
});
export const updateSourceSchema = z.object({
  isActive: z.boolean().optional(),
  channel: z.string().optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
  serviceType: serviceTypeEnum.optional(),
  sourceId: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
  spend: z.coerce.number().min(0).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const updateCampaignSchema = z.object({
  status: z.enum(['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  spend: z.coerce.number().min(0).optional(),
  budget: z.coerce.number().min(0).optional(),
});

export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
