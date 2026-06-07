import { z } from 'zod';

// Courses
export const createCourseSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().optional(),
  profession: z.string().optional(),
  level: z.string().optional(),
  durationWeeks: z.coerce.number().int().min(0).max(260).optional(),
  price: z.coerce.number().min(0).optional(),
});
export const updateCourseSchema = createCourseSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Faculty
export const createFacultySchema = z.object({
  name: z.string().min(2),
  specialization: z.string().optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
});

// Batches
export const createBatchSchema = z.object({
  courseId: z.string().min(1),
  facultyId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  timing: z.string().optional(),
  seatLimit: z.coerce.number().int().min(0).max(1000).default(0),
});
export const updateBatchSchema = createBatchSchema.partial().extend({
  status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
});

// Students
export const enrollStudentSchema = z.object({
  leadId: z.string().optional(),
  name: z.string().min(2).optional(),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
}).refine((v) => v.leadId || v.name, { message: 'Provide either leadId or name' });

export const updateStudentSchema = z.object({
  status: z.enum(['ENROLLED', 'ACTIVE', 'COMPLETED', 'DROPPED', 'ON_HOLD', 'CANCELLED']).optional(),
  batchId: z.string().optional(),
  courseId: z.string().optional(),
  progressPct: z.coerce.number().int().min(0).max(100).optional(),
  attendancePct: z.coerce.number().int().min(0).max(100).optional(),
  issueCertificate: z.boolean().optional(),
});

// Demos
export const createDemoSchema = z.object({
  leadName: z.string().min(2),
  coordinatorId: z.string().optional(),
  scheduledAt: z.coerce.date().optional(),
  recommendedCourse: z.string().optional(),
});
export const updateDemoSchema = z.object({
  outcome: z.enum(['interested', 'not_interested', 'follow_up', 'enrolled', 'lost']).optional(),
  likelihood: z.coerce.number().int().min(0).max(100).optional(),
  scheduledAt: z.coerce.date().optional(),
  recommendedCourse: z.string().optional(),
});

export const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateFacultyInput = z.infer<typeof createFacultySchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateDemoInput = z.infer<typeof createDemoSchema>;
export type UpdateDemoInput = z.infer<typeof updateDemoSchema>;
export type ListInput = z.infer<typeof listSchema>;
