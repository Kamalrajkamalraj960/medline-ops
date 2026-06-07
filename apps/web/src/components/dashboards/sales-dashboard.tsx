'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/ui';
import { StatusBadge } from '@/components/ui';

interface LeadStats {
  total: number;
  byStatus: { status: string; _count: number }[];
  byService: { serviceType: string; _count: number }[];
  legacyBothNeedsReview: number;
}

const PIPELINE = ['NEW', 'CONTACTED', 'INTERESTED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'DOCUMENTATION', 'CONVERTED', 'LOST'];

export function SalesDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['leads-stats'], queryFn: async () => (await api.get<LeadStats>('/leads/stats')).data });

  const count = (s: string) => data?.byStatus.find((x) => x.status === s)?._count ?? 0;
  const converted = count('CONVERTED');
  const lost = count('LOST');
  const hot = count('INTERESTED') + count('DEMO_SCHEDULED') + count('DEMO_COMPLETED');
  const conversionRate = data?.total ? Math.round((converted / data.total) * 1000) / 10 : 0;
  const maxStage = Math.max(1, ...PIPELINE.map(count));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Leads" value={isLoading ? '—' : data!.total} icon="Users" accent="brand" />
        <KpiCard label="Hot Leads" value={isLoading ? '—' : hot} icon="Flame" accent="rose" delay={0.05} />
        <KpiCard label="Converted" value={isLoading ? '—' : converted} icon="CheckCircle2" accent="green" delay={0.1} />
        <KpiCard label="Conversion Rate" value={isLoading ? '—' : `${conversionRate}%`} icon="TrendingUp" accent="violet" delay={0.15} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Pipeline</h2>
          <div className="space-y-3">
            {PIPELINE.map((stage) => (
              <div key={stage} className="flex items-center gap-3">
                <div className="w-36 shrink-0"><StatusBadge status={stage} /></div>
                <div className="h-6 flex-1 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  <div className="flex h-full items-center justify-end rounded-lg bg-brand-500/80 px-2 text-xs font-medium text-white transition-all" style={{ width: `${(count(stage) / maxStage) * 100}%` }}>
                    {count(stage) > 0 && count(stage)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">By Service</h2>
            {(data?.byService ?? []).map((s) => (
              <div key={s.serviceType} className="flex items-center justify-between py-1.5 text-sm">
                <span className="capitalize text-slate-600 dark:text-slate-300">{s.serviceType}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{s._count}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-300">Lost</span>
              <span className="font-semibold text-rose-600">{lost}</span>
            </div>
          </div>

          {(data?.legacyBothNeedsReview ?? 0) > 0 && (
            <div className="card border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {data!.legacyBothNeedsReview} legacy lead(s) marked “Both” need reassignment to consultancy or academy.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
