'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { inr } from '@/lib/utils';
import { KpiCard, PageHeader } from '@/components/ui';
import type { GstSummary } from '@/lib/types';

export default function GstPage() {
  const { data, isLoading } = useQuery({ queryKey: ['gst'], queryFn: async () => (await api.get<GstSummary>('/accounts/gst')).data });

  return (
    <div>
      <PageHeader title="GST" subtitle="Tax collected, liability & turnover" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="GST Collected" value={isLoading ? '—' : inr(data!.gstCollected)} icon="Percent" accent="green" />
        <KpiCard label="GST Pending" value={isLoading ? '—' : inr(data!.gstPending)} icon="Clock" accent="amber" delay={0.05} />
        <KpiCard label="Taxable Turnover" value={isLoading ? '—' : inr(data!.taxableTurnover)} icon="TrendingUp" accent="brand" delay={0.1} />
        <KpiCard label="Tax Liability" value={isLoading ? '—' : inr(data!.taxLiability)} icon="Landmark" accent="violet" delay={0.15} />
      </div>
      <div className="mt-6 card text-sm text-slate-500 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-200">Filing registers</p>
        <p className="mt-1">GSTR-1, GSTR-3B, export register and LUT tracking are derived from issued invoices. These exports are the next slice in the accounts roadmap.</p>
      </div>
    </div>
  );
}
