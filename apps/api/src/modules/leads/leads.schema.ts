import { z } from 'zod';

// The ONLY accepted service types. Anything else (notably "both") is rejected
// at the edge before it can reach the database.
export const serviceTypeSchema = z.enum(['consultancy', 'academy'], {
  errorMap: () => ({ message: "serviceType must be 'consultancy' or 'academy' ('both' is not allowed)" }),
});

export const createLeadSchema = z.object({
  // Step 1 — Basic Info
  name: z.string().min(2),
  phone: z.string().min(5),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  gender: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  nationality: z.string().optional(),
  // Step 2 — Professional
  profession: z.string().optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  currentEmployer: z.string().optional(),
  highestQualification: z.string().optional(),
  currentCountry: z.string().optional(),
  preferredDestination: z.string().optional(),
  // Step 3 — Service
  serviceType: serviceTypeSchema,
  urgency: z.enum(['IMMEDIATE', 'WITHIN_3_MONTHS', 'WITHIN_6_MONTHS', 'JUST_EXPLORING']).optional(),
  // Step 4 — Source & Assign
  leadSource: z.string().optional(),
  sourceDetails: z.string().optional(),
  sourceId: z.string().optional(),
  campaignId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  remarks: z.string().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  ownerId: z.string().optional(),
  passport: z.string().optional(),
  nationalId: z.string().optional(),
  // Explicit override to proceed past a duplicate warning.
  forceCreate: z.boolean().optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  status: z
    .enum(['NEW', 'CONTACTED', 'INTERESTED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'DOCUMENTATION', 'CONVERTED', 'LOST'])
    .optional(),
  lostReason: z.string().optional(),
  nextFollowUpAt: z.coerce.date().optional(),
});

export const listLeadsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  serviceType: serviceTypeSchema.optional(),
  ownerId: z.string().optional(),
  priority: z.string().optional(),
  search: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsInput = z.infer<typeof listLeadsSchema>;
