import type { CaseStatus } from '@medline/db';

/** Ordered case lifecycle with the progress % each stage represents. */
export const CASE_STAGES: { status: CaseStatus; label: string; progress: number }[] = [
  { status: 'DOCUMENT_COLLECTION', label: 'Document Collection', progress: 5 },
  { status: 'VERIFICATION', label: 'Verification', progress: 15 },
  { status: 'READY_FOR_SUBMISSION', label: 'Ready For Submission', progress: 25 },
  { status: 'SUBMITTED', label: 'Submitted', progress: 40 },
  { status: 'UNDER_REVIEW', label: 'Under Review', progress: 55 },
  { status: 'ADDITIONAL_DOCS_REQUIRED', label: 'Additional Documents Required', progress: 50 },
  { status: 'ELIGIBILITY_RECEIVED', label: 'Eligibility Received', progress: 70 },
  { status: 'EXAM_SCHEDULED', label: 'Exam Scheduled', progress: 80 },
  { status: 'EXAM_PASSED', label: 'Exam Passed', progress: 90 },
  { status: 'LICENSE_PROCESSING', label: 'License Processing', progress: 95 },
  { status: 'COMPLETED', label: 'Completed', progress: 100 },
  { status: 'REJECTED', label: 'Rejected', progress: 100 },
  { status: 'CLOSED', label: 'Closed', progress: 100 },
  { status: 'ARCHIVED', label: 'Archived', progress: 100 },
];

export const PROGRESS_BY_STATUS: Record<CaseStatus, number> = Object.fromEntries(
  CASE_STAGES.map((s) => [s.status, s.progress]),
) as Record<CaseStatus, number>;

/** Cases in these stages still sit in the submission queue. */
export const QUEUE_STATUSES: CaseStatus[] = [
  'DOCUMENT_COLLECTION',
  'VERIFICATION',
  'READY_FOR_SUBMISSION',
  'ADDITIONAL_DOCS_REQUIRED',
];

export const CLOSED_STATUSES: CaseStatus[] = ['COMPLETED', 'REJECTED', 'CLOSED', 'ARCHIVED'];

export const SUPPORTED_AUTHORITIES = ['DHA', 'MOH UAE', 'SCFHS', 'QCHP', 'NHRA', 'OMSB', 'HAAD'];

export const DOCUMENT_CATEGORIES = [
  'Passport',
  'Degree Certificate',
  'Diploma Certificate',
  'Transcript',
  'Experience Certificate',
  'Employment Certificate',
  'Good Standing Certificate',
  'Professional License',
  'Passport Photo',
  'National ID',
  'CV / Resume',
  'Medical Registration',
  'Police Clearance',
  'Additional Documents',
];
