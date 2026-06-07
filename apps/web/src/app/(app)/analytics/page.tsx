'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { inr } from '@/lib/utils';
import { KpiCard, PageHeader } from '@/components/ui';
import type { LeadSourceRow, MarketingStats } from '@/lib/types';

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['marketing-stats'], queryFn: async () => (await api.get<MarketingStats>('/marketing/stats')).data });
  const { data: sources } = useQuery({ queryKey: ['sources'], queryFn: async () => (await api.get<LeadSourceRow[]>('/marketing/sources')).data });

  const chartData = (sources ?? [])
    .filter((s) => s.leads > 0)
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 8)
    .map((s) => ({ name: s.name, Leads: s.leads, Conversions: s.conversions }));

  return (
    <div>
      <PageHeader title="Marketing Analytics" subtitle="Attribution, ROI & source performance" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Leads This Month" value={isLoading ? '—' : stats!.leadsThisMonth} icon="Users" accent="brand" />
        <KpiCard label="Cost Per Lead" value={isLoading ? '—' : inr(stats!.costPerLead)} icon="DollarSign" accent="amber" delay={0.05} />
        <KpiCard label="Conversion Rate" value={isLoading ? '—' : `${stats!.conversionRate}%`} icon="TrendingUp" accent="green" delay={0.1} />
        <KpiCard label="Best Source" value={isLoading ? '—' : stats!.bestSource} icon="Radar" accent="violet" delay={0.15} />
        <KpiCard label="Active Campaigns" value={isLoading ? '—' : stats!.activeCampaigns} icon="Megaphone" accent="brand" delay={0.2} />
        <KpiCard label="Total Ad Spend" value={isLoading ? '—' : inr(stats!.totalSpend)} icon="Wallet" accent="rose" delay={0.25} />
      </div>

      <div className="mt-6 card">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Leads vs Conversions by Source</h2>
        {chartData.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No lead data yet to chart.</p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Leads" fill="#327bff" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Conversions" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
