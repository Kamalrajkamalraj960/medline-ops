import { cn } from '@/lib/utils';
import type { LeadPriority, LeadStage } from './types';

const STAGE_TONES: Record<LeadStage, string> = {
  New: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Contacted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Interested: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'Demo Scheduled': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'Demo Completed': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Documentation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Converted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Lost: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

export function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', STAGE_TONES[stage])}>
      {stage}
    </span>
  );
}

const PRIORITY_TONES: Record<LeadPriority, string> = {
  Low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Medium: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const PRIORITY_DOT: Record<LeadPriority, string> = {
  Low: 'bg-slate-400',
  Medium: 'bg-sky-500',
  High: 'bg-orange-500',
  Urgent: 'bg-red-500',
};

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        PRIORITY_TONES[priority],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[priority])} />
      {priority}
    </span>
  );
}
