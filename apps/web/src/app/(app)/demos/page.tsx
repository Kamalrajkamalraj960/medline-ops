'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { Demo } from '@/lib/types';

const outcomeTone = (o: string | null): 'green' | 'rose' | 'amber' | 'slate' | 'blue' => {
  if (o === 'enrolled') return 'green';
  if (o === 'lost' || o === 'not_interested') return 'rose';
  if (o === 'follow_up') return 'amber';
  if (o === 'interested') return 'blue';
  return 'slate';
};

export default function DemosPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('demo:create'));
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['demos'], queryFn: async () => (await api.get<Demo[]>('/academy/demos')).data });

  const update = useMutation({
    mutationFn: async (v: { id: string; outcome: string }) => (await api.patch(`/academy/demos/${v.id}`, { outcome: v.outcome })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demos'] }),
  });

  return (
    <div>
      <PageHeader
        title="Demo Sessions"
        subtitle="Counseling demos & trial sessions"
        action={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Schedule Demo</button>}
      />

      <div className="card">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No demo sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Lead</th>
                  <th className="pb-2 font-medium">Recommended</th>
                  <th className="pb-2 font-medium">Likelihood</th>
                  <th className="pb-2 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{d.leadName}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{d.recommendedCourse ?? '—'}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{d.likelihood != null ? `${d.likelihood}%` : '—'}</td>
                    <td className="py-3">
                      <select
                        className="rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700"
                        value={d.outcome ?? ''}
                        onChange={(e) => update.mutate({ id: d.id, outcome: e.target.value })}
                      >
                        <option value="">Pending</option>
                        {['interested', 'not_interested', 'follow_up', 'enrolled', 'lost'].map((o) => <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>)}
                      </select>
                      {d.outcome && <span className="ml-2 align-middle"><Badge tone={outcomeTone(d.outcome)}>{d.outcome.replaceAll('_', ' ')}</Badge></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <NewDemo onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['demos'] }); }} />}
    </div>
  );
}

function NewDemo({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ leadName: '', recommendedCourse: '', scheduledAt: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/academy/demos', {
      leadName: form.leadName, recommendedCourse: form.recommendedCourse || undefined,
      scheduledAt: form.scheduledAt || undefined,
    })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="Schedule Demo" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Lead name *</label><input className="input" required value={form.leadName} onChange={(e) => setForm({ ...form, leadName: e.target.value })} /></div>
        <div><label className="label">Recommended course</label><input className="input" value={form.recommendedCourse} onChange={(e) => setForm({ ...form, recommendedCourse: e.target.value })} /></div>
        <div><label className="label">Scheduled at</label><input className="input" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Schedule</button>
      </form>
    </Drawer>
  );
}
