import { cn } from '@/lib/utils';

// ---- Domain types (mirror the /authority-tracking API responses) ----
export interface AuthorityRow {
  id: string;
  caseId: string;
  caseReference: string | null;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  profession: string | null;
  authority: string;
  referenceNumber: string | null;
  status: string;
  submissionDate: string | null;
  expectedCompletionDate: string | null;
  lastResponseAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  daysPending: number;
  followUpStatus: 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE' | 'RESOLVED';
}

export interface AuthorityTimelineEntry {
  at: string;
  event: string;
  detail?: string;
}

export interface AuthorityFollowUp {
  id: string;
  type: string;
  dueAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface AuthorityDetail extends AuthorityRow {
  timeline: AuthorityTimelineEntry[];
  followUps: AuthorityFollowUp[];
}

export interface AuthorityStatsResponse {
  casesWithAuthorities: number;
  overdueFollowUps: number;
  cards: { authority: string; activeCases: number }[];
}

// ---- Status presentation ----
export const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ADDITIONAL_DOCS_REQUESTED', label: 'Additional Docs Required' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_META: Record<string, { label: string; tone: string }> = {
  NOT_STARTED: { label: 'Not Started', tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  PREPARING: { label: 'Preparing', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  SUBMITTED: { label: 'Submitted', tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  UNDER_REVIEW: { label: 'Under Review', tone: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  ADDITIONAL_DOCS_REQUESTED: { label: 'Additional Docs Required', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  ELIGIBILITY_ISSUED: { label: 'Eligibility Issued', tone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  EXAM_SCHEDULED: { label: 'Exam Scheduled', tone: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  APPROVED: { label: 'Approved', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  REJECTED: { label: 'Rejected', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  CLOSED: { label: 'Closed', tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

export function statusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status;
}

export function AuthorityStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.NOT_STARTED;
  return <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', meta.tone)}>{meta.label}</span>;
}

// ---- Follow-up presentation ----
const FOLLOWUP_META: Record<string, { label: string; tone: string; dot: string }> = {
  ON_TRACK: { label: 'On Track', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  DUE_SOON: { label: 'Due Soon', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
  OVERDUE: { label: 'Overdue', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', dot: 'bg-rose-500' },
  RESOLVED: { label: 'Resolved', tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', dot: 'bg-slate-400' },
};

export function FollowUpBadge({ status }: { status: string }) {
  const meta = FOLLOWUP_META[status] ?? FOLLOWUP_META.ON_TRACK;
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', meta.tone)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

/** Colour for the "days pending" cell — 15+ warning, 30+ danger. */
export function daysPendingClass(days: number, terminal: boolean): string {
  if (terminal) return 'text-slate-400';
  if (days >= 30) return 'font-semibold text-rose-600 dark:text-rose-400';
  if (days >= 15) return 'font-medium text-amber-600 dark:text-amber-400';
  return 'text-slate-600 dark:text-slate-300';
}

export function fmtDate(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}
