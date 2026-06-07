'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, PageHeader, ProgressBar } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { LeadSourceRow } from '@/lib/types';

export default function LeadSourcesPage() {
  const qc = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission('lead_source:manage'));
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['sources'], queryFn: async () => (await api.get<LeadSourceRow[]>('/marketing/sources')).data });

  const toggle = useMutation({
    mutationFn: async (v: { id: string; isActive: boolean }) => (await api.patch(`/marketing/sources/${v.id}`, { isActive: v.isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  });

  return (
    <div>
      <PageHeader
        title="Lead Sources"
        subtitle="Channel performance & conversion attribution"
        action={canManage && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Source</button>}
      />
      <div className="card">
        {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No lead sources.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium text-right">Leads</th>
                  <th className="pb-2 font-medium text-right">Conversions</th>
                  <th className="pb-2 font-medium w-40">Conversion rate</th>
                  <th className="pb-2 font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{s.name}{s.channel && <span className="ml-2 text-xs text-slate-400">{s.channel}</span>}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{s.leads}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{s.conversions}</td>
                    <td className="py-3"><div className="flex items-center gap-2"><ProgressBar value={s.conversionRate} /><span className="w-10 text-right text-xs text-slate-400">{s.conversionRate}%</span></div></td>
                    <td className="py-3">
                      {canManage ? (
                        <button onClick={() => toggle.mutate({ id: s.id, isActive: !s.isActive })}>
                          <Badge tone={s.isActive ? 'green' : 'slate'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
                        </button>
                      ) : <Badge tone={s.isActive ? 'green' : 'slate'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && <NewSource onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['sources'] }); }} />}
    </div>
  );
}

function NewSource({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', channel: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/marketing/sources', { name: form.name, channel: form.channel || undefined })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="Add Lead Source" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Source name *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="TikTok Ads" /></div>
        <div><label className="label">Channel</label><input className="input" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="Paid Social" /></div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add Source</button>
      </form>
    </Drawer>
  );
}
