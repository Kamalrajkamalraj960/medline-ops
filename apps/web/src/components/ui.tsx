'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Icon } from './icon';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  accent = 'brand',
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent?: 'brand' | 'green' | 'amber' | 'violet' | 'rose';
  delay?: number;
}) {
  const accents: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-600/15 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-600/15 dark:text-amber-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-600/15 dark:text-violet-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-600/15 dark:text-rose-300',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="card flex items-center gap-4"
    >
      <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', accents[accent])}>
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </motion.div>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'blue' | 'amber' | 'green' | 'rose' | 'violet';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  };
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    NEW: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    CONTACTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    INTERESTED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    DEMO_SCHEDULED: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    DEMO_COMPLETED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    DOCUMENTATION: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    CONVERTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    LOST: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', map[status] ?? map.NEW)}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
