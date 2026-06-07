import { prisma } from '@medline/db';

/**
 * Whitelisted report sources. Each maps to a Prisma delegate plus the ONLY
 * fields that may be grouped/summed — so a report request can never reach an
 * arbitrary column or run raw SQL.
 */
export interface ReportSource {
  label: string;
  delegate: { groupBy: (args: unknown) => Promise<unknown> };
  dateField: string;
  /** Scalar/enum fields allowed as the "group by" dimension. */
  dimensions: { field: string; label: string }[];
  /** Decimal field allowed for the "sum" metric, if any. */
  sumField?: string;
}

export const REPORT_SOURCES: Record<string, ReportSource> = {
  leads: {
    label: 'Leads',
    delegate: prisma.lead as never,
    dateField: 'createdAt',
    dimensions: [
      { field: 'status', label: 'Status' },
      { field: 'serviceType', label: 'Service type' },
      { field: 'priority', label: 'Priority' },
    ],
  },
  cases: {
    label: 'Consultancy cases',
    delegate: prisma.consultancyCase as never,
    dateField: 'createdAt',
    dimensions: [
      { field: 'status', label: 'Status' },
      { field: 'authority', label: 'Authority' },
      { field: 'priority', label: 'Priority' },
    ],
  },
  payments: {
    label: 'Payments',
    delegate: prisma.payment as never,
    dateField: 'createdAt',
    dimensions: [
      { field: 'method', label: 'Method' },
      { field: 'status', label: 'Status' },
    ],
    sumField: 'amount',
  },
  invoices: {
    label: 'Invoices',
    delegate: prisma.invoice as never,
    dateField: 'createdAt',
    dimensions: [{ field: 'status', label: 'Status' }],
    sumField: 'amount',
  },
  students: {
    label: 'Academy students',
    delegate: prisma.academyStudent as never,
    dateField: 'enrolledAt',
    dimensions: [{ field: 'status', label: 'Status' }],
  },
  campaigns: {
    label: 'Campaigns',
    delegate: prisma.campaign as never,
    dateField: 'createdAt',
    dimensions: [
      { field: 'status', label: 'Status' },
      { field: 'type', label: 'Type' },
    ],
    sumField: 'spend',
  },
};
