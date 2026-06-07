'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { inr } from '@/lib/utils';
import { Badge, PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { AuthorityPayment } from '@/lib/types';

const TYPES = ['Eligibility', 'Exam', 'License', 'DataFlow', 'Other'];
const AUTHORITIES = ['DHA', 'MOH UAE', 'SCFHS', 'QCHP', 'NHRA', 'OMSB', 'HAAD'];
const tone = (s: string): 'green' | 'amber' | 'blue' | 'rose' =>
  s === 'RECOVERED' ? 'green' : s === 'PAID' ? 'blue' : s === 'CANCELLED' ? 'rose' : 'amber';

export default function AuthorityPaymentsPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('payment:create'));
  const canEdit = useAuthStore((s) => s.hasPermission('payment:edit'));
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['authority-payments'], queryFn: async () => (await api.get<AuthorityPayment[]>('/accounts/authority-payments')).data });

  const update = useMutation({
    mutationFn: async (v: { id: string; body: Record<string, unknown> }) => (await api.patch(`/accounts/authority-payments/${v.id}`, v.body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['authority-payments'] }),
  });

  return (
    <div>
      <PageHeader
        title="Authority Payments"
        subtitle="Fees paid to authorities & recovery tracking"
        action={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Entry</button>}
      />
      <div className="card">
        {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No authority payments recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Authority</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium">Recovered</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{p.clientName}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{p.authority}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{p.type}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{inr(p.amount)}</td>
                    <td className="py-3">
                      {canEdit ? (
                        <input type="checkbox" checked={p.recovered} onChange={(e) => update.mutate({ id: p.id, body: { recovered: e.target.checked, status: e.target.checked ? 'RECOVERED' : 'PAID' } })} />
                      ) : (p.recovered ? 'Yes' : 'No')}
                    </td>
                    <td className="py-3">
                      {canEdit ? (
                        <select className="rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700" value={p.status} onChange={(e) => update.mutate({ id: p.id, body: { status: e.target.value } })}>
                          {['PENDING', 'PAID', 'RECOVERED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : <Badge tone={tone(p.status)}>{p.status}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && <NewEntry onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['authority-payments'] }); }} />}
    </div>
  );
}

function NewEntry({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ clientName: '', authority: 'DHA', type: 'Eligibility', amount: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/accounts/authority-payments', { clientName: form.clientName, authority: form.authority, type: form.type, amount: form.amount })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="New Authority Payment" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Client name *</label><input className="input" required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Authority</label>
            <select className="input" value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })}>{AUTHORITIES.map((a) => <option key={a}>{a}</option>)}</select>
          </div>
          <div><label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
        </div>
        <div><label className="label">Amount (₹) *</label><input className="input" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add Entry</button>
      </form>
    </Drawer>
  );
}
