import type { AuthorityStatus } from '@medline/db';

/** Authorities surfaced as dashboard counter cards. */
export const AUTHORITY_CARDS = ['DHA', 'MOH UAE', 'HAAD', 'SCFHS', 'Prometric', 'Dataflow'] as const;

/** Full authority list for create/filter (cards + other regulators). */
export const AUTHORITIES = [
  'DHA', 'MOH UAE', 'HAAD', 'SCFHS', 'Prometric', 'Dataflow',
  'QCHP', 'NHRA', 'OMSB', 'Nursing Council', 'Pharmacy Council', 'Other',
];

export const AUTHORITY_STATUSES = [
  'NOT_STARTED', 'PREPARING', 'SUBMITTED', 'UNDER_REVIEW',
  'ADDITIONAL_DOCS_REQUESTED', 'ELIGIBILITY_ISSUED', 'EXAM_SCHEDULED',
  'APPROVED', 'REJECTED', 'CLOSED',
] as const;

/** Statuses that end the pending clock. */
export const TERMINAL_STATUSES: AuthorityStatus[] = ['APPROVED', 'REJECTED', 'CLOSED'];

export const DUE_SOON_DAYS = 15;
export const OVERDUE_DAYS = 30;
