'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { PageHeader } from '@/components/ui';
import type { Lead } from '@/lib/types';

// Academy lead pipeline. Reuses the CRM leads API filtered to academy.
const STAGES = [
  { status: 'NEW', label: 'New' },
  { status: 'CONTACTED', label: 'Contacted' },
  { status: 'INTERESTED', label: 'Interested' },
  { status: 'DEMO_SCHEDULED', label: 'Demo Scheduled' },
  { status: 'DEMO_COMPLETED', label: 'Demo Done' },
  { status: 'CONVERTED', label: 'Enrolled' },
  { status: 'LOST', label: 'Lost' },
];

export default function AcademyPipelinePage() {
  const qc = useQueryClient();
  const canEdit = useAuthStore((s) => s.hasPermission('lead:edit'));

  const { data, isLoading } = useQuery({
    queryKey: ['academy-pipeline'],
    queryFn: async () => (await api.get<{ items: Lead[] }>('/leads', { params: { serviceType: 'academy', pageSize: 100 } })).data.items,
  });

  const move = useMutation({
    mutationFn: async (v: { id: string; status: string }) => (await api.patch(`/leads/${v.id}`, { status: v.status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academy-pipeline'] }),
  });

  const byStage = (status: string) => data?.filter((l) => l.status === status) ?? [];

  return (
    <div>
      <PageHeader title="Academy Pipeline" subtitle="Enrollment journey for academy leads" />
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-7">
          {STAGES.map((stage) => {
            const leads = byStage(stage.status);
            return (
              <div key={stage.status} className="rounded-2xl bg-slate-100/60 p-3 dark:bg-slate-900/40">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{stage.label}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800">{leads.length}</span>
                </div>
                <div className="space-y-2">
                  {leads.map((l) => (
                    <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{l.name}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400"><Phone className="h-3 w-3" />{l.phone}</p>
                      {l.profession && <p className="text-xs text-slate-400">{l.profession}</p>}
                      {canEdit && (
                        <select
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700"
                          value={l.status}
                          onChange={(e) => move.mutate({ id: l.id, status: e.target.value })}
                        >
                          {STAGES.map((s) => <option key={s.status} value={s.status}>{s.label}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                  {leads.length === 0 && <p className="px-1 py-4 text-center text-xs text-slate-400">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
