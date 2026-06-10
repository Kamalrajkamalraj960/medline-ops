'use client';

import { BookOpen, CheckCircle2, GraduationCap, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AcademyStats } from '@/lib/types';

function StatCard({
  label,
  value,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  loading?: boolean;
}) {
  return (
    <div className="card flex items-center gap-4">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', accent)}>{icon}</span>
      <div className="min-w-0">
        {loading ? (
          <div className="h-7 w-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ) : (
          <p className="text-2xl font-bold leading-none text-slate-900 dark:text-white">{value}</p>
        )}
        <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function CourseStats({ stats, loading }: { stats?: AcademyStats; loading?: boolean }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total Courses"
        value={stats?.totalCourses ?? 0}
        loading={loading}
        icon={<BookOpen className="h-5 w-5" />}
        accent="bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300"
      />
      <StatCard
        label="Active Courses"
        value={stats?.activeCourses ?? 0}
        loading={loading}
        icon={<CheckCircle2 className="h-5 w-5" />}
        accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-600/15 dark:text-emerald-300"
      />
      <StatCard
        label="Total Students"
        value={stats?.totalStudents ?? 0}
        loading={loading}
        icon={<GraduationCap className="h-5 w-5" />}
        accent="bg-violet-50 text-violet-600 dark:bg-violet-600/15 dark:text-violet-300"
      />
      <StatCard
        label="Total Batches"
        value={stats?.totalBatches ?? 0}
        loading={loading}
        icon={<CalendarDays className="h-5 w-5" />}
        accent="bg-amber-50 text-amber-600 dark:bg-amber-600/15 dark:text-amber-300"
      />
    </div>
  );
}
