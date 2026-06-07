'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/ui';

interface DocStats {
  pendingSubmissions: number;
  withAuthorities: number;
  completedThisMonth: number;
  overdueFollowUps: number;
  docsPendingVerification: number;
}

export function DocumentationDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['consultancy-stats'], queryFn: async () => (await api.get<DocStats>('/consultancy/stats')).data });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Pending Submissions" value={isLoading ? '—' : data!.pendingSubmissions} icon="Inbox" accent="amber" />
        <KpiCard label="With Authorities" value={isLoading ? '—' : data!.withAuthorities} icon="Landmark" accent="brand" delay={0.05} />
        <KpiCard label="Completed (Month)" value={isLoading ? '—' : data!.completedThisMonth} icon="CheckCircle2" accent="green" delay={0.1} />
        <KpiCard label="Overdue Follow-ups" value={isLoading ? '—' : data!.overdueFollowUps} icon="AlarmClock" accent="rose" delay={0.15} />
        <KpiCard label="Docs Pending Verify" value={isLoading ? '—' : data!.docsPendingVerification} icon="FileSearch" accent="violet" delay={0.2} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/consultancy" className="card transition hover:border-brand-400 hover:shadow-md">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">All Cases →</p>
          <p className="mt-1 text-sm text-slate-500">Open the case workspace</p>
        </Link>
        <Link href="/consultancy?queue=1" className="card transition hover:border-brand-400 hover:shadow-md">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Submission Queue →</p>
          <p className="mt-1 text-sm text-slate-500">Cases awaiting submission</p>
        </Link>
        <Link href="/authorities" className="card transition hover:border-brand-400 hover:shadow-md">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Authority Tracking →</p>
          <p className="mt-1 text-sm text-slate-500">Monitor authority responses</p>
        </Link>
      </div>
    </>
  );
}
