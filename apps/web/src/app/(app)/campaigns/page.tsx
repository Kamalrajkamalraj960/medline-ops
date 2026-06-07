'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { inr } from '@/lib/utils';
import { Badge, PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { CampaignRow, LeadSourceRow } from '@/lib/types';

const campTone = (s: string): 'green' | 'blue' | 'amber' | 'slate' =>
  s === 'ACTIVE' ? 'green' : s === 'SCHEDULED' ? 'blue' : s === 'PAUSED' ? 'amber' : 'slate';

export default function CampaignsPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('campaign:create'));
  const canEdit = useAuthStore((s) => s.hasPermission('campaign:edit'));
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: async () => (await api.get<CampaignRow[]>('/marketing/campaigns')).data });

  const update = useMutation({
    mutationFn: async (v: { id: string; status: string }) => (await api.patch(`/marketing/campaigns/${v.id}`, { status: v.status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle="Performance, spend & ROI"
        action={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Campaign</button>}
      />
      <div className="card">
        {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No campaigns yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Campaign</th>
                  <th className="pb-2 font-medium">Service</th>
                  <th className="pb-2 font-medium text-right">Leads</th>
                  <th className="pb-2 font-medium text-right">Conv.</th>
                  <th className="pb-2 font-medium text-right">Spend</th>
                  <th className="pb-2 font-medium text-right">CPL</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.type}{c.source ? ` · ${c.source.name}` : ''}</p>
                    </td>
                    <td className="py-3 capitalize text-slate-600 dark:text-slate-300">{c.serviceType ?? '—'}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{c.leads}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{c.conversions}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{inr(c.spend)}</td>
                    <td className="py-3 text-right text-slate-500">{c.costPerLead ? inr(c.costPerLead) : '—'}</td>
                    <td className="py-3">
                      {canEdit ? (
                        <select className="rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700" value={c.status} onChange={(e) => update.mutate({ id: c.id, status: e.target.value })}>
                          {['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : <Badge tone={campTone(c.status)}>{c.status}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && <NewCampaign onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['campaigns'] }); }} />}
    </div>
  );
}

function NewCampaign({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: sources } = useQuery({ queryKey: ['sources'], queryFn: async () => (await api.get<LeadSourceRow[]>('/marketing/sources')).data });
  const [form, setForm] = useState({ name: '', type: 'Lead Generation', serviceType: '', sourceId: '', budget: '', spend: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/marketing/campaigns', {
      name: form.name, type: form.type,
      serviceType: form.serviceType || undefined,
      sourceId: form.sourceId || undefined,
      budget: form.budget || undefined, spend: form.spend || undefined,
    })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="New Campaign" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Campaign name *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Type</label>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {['Lead Generation', 'Brand Awareness', 'Academy Enrollment', 'Consultancy Leads', 'Referral Campaign', 'Remarketing', 'Webinar'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="label">Service type</label>
          {/* No "Both" — consultancy or academy only (or unset). */}
          <select className="input" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
            <option value="">Not specified</option>
            <option value="consultancy">Consultancy</option>
            <option value="academy">Academy</option>
          </select>
        </div>
        <div><label className="label">Source</label>
          <select className="input" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}>
            <option value="">No source</option>
            {sources?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Budget (₹)</label><input className="input" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
          <div><label className="label">Spend (₹)</label><input className="input" type="number" value={form.spend} onChange={(e) => setForm({ ...form, spend: e.target.value })} /></div>
        </div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create Campaign</button>
      </form>
    </Drawer>
  );
}
