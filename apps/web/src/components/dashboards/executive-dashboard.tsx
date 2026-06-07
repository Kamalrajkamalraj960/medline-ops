'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { KpiCard, StatusBadge } from '@/components/ui';

interface Metrics {
  kpis: {
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
    totalStudents: number;
    pendingTasks: number;
    openCases: number;
    activeUsers: number;
  };
  recentLeads: { id: string; reference: string; name: string; serviceType: string; status: string; createdAt: string }[];
}

export function ExecutiveDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => (await api.get<Metrics>('/dashboard/metrics')).data,
  });

  return (
    <>
      {isError && (
        <div className="card mb-4 text-sm text-rose-600">
          Couldn’t reach the API. Make sure the backend is running on port 4000.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Leads" value={isLoading ? '—' : data!.kpis.totalLeads} icon="Users" accent="brand" />
        <KpiCard label="Converted" value={isLoading ? '—' : data!.kpis.convertedLeads} icon="CheckCircle2" accent="green" delay={0.05} />
        <KpiCard label="Conversion Rate" value={isLoading ? '—' : `${data!.kpis.conversionRate}%`} icon="TrendingUp" accent="violet" delay={0.1} />
        <KpiCard label="Students" value={isLoading ? '—' : data!.kpis.totalStudents} icon="GraduationCap" accent="amber" delay={0.15} />
        <KpiCard label="Pending Tasks" value={isLoading ? '—' : data!.kpis.pendingTasks} icon="ListChecks" accent="rose" delay={0.2} />
        <KpiCard label="Open Cases" value={isLoading ? '—' : data!.kpis.openCases} icon="FileCheck" accent="brand" delay={0.25} />
        <KpiCard label="Active Users" value={isLoading ? '—' : data!.kpis.activeUsers} icon="UserCog" accent="green" delay={0.3} />
      </div>

      <div className="mt-6 card">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Recent Leads</h2>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !data || data.recentLeads.length === 0 ? (
          <p className="text-sm text-slate-400">No leads yet. Create one from the CRM.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Reference</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Service</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-2.5 font-mono text-xs text-slate-500">{lead.reference}</td>
                    <td className="py-2.5 font-medium text-slate-900 dark:text-white">{lead.name}</td>
                    <td className="py-2.5 capitalize text-slate-600 dark:text-slate-300">{lead.serviceType}</td>
                    <td className="py-2.5"><StatusBadge status={lead.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
