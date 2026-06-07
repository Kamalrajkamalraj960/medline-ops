'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { inr } from '@/lib/utils';
import { Badge, PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { Refund } from '@/lib/types';

const refundTone = (s: string): 'green' | 'amber' | 'rose' | 'blue' =>
  s === 'PROCESSED' ? 'green' : s === 'APPROVED' ? 'blue' : s === 'REJECTED' ? 'rose' : 'amber';

export default function RefundsPage() {
  const qc = useQueryClient();
  const canRequest = useAuthStore((s) => s.hasPermission('refund:view'));
  const canApprove = useAuthStore((s) => s.hasPermission('refund:approve'));
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['refunds'], queryFn: async () => (await api.get<Refund[]>('/accounts/refunds')).data });

  const decide = useMutation({
    mutationFn: async (v: { id: string; status: string }) => (await api.patch(`/accounts/refunds/${v.id}`, { status: v.status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['refunds'] }),
  });

  return (
    <div>
      <PageHeader
        title="Refunds"
        subtitle="Refund requests & processing"
        action={canRequest && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Request Refund</button>}
      />
      <div className="card">
        {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No refund requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{r.clientName}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{inr(r.amount)}</td>
                    <td className="py-3 text-slate-500">{r.reason ?? '—'}</td>
                    <td className="py-3"><Badge tone={refundTone(r.status)}>{r.status}</Badge></td>
                    <td className="py-3 text-right">
                      {canApprove && (
                        <div className="inline-flex gap-2">
                          {r.status === 'PENDING' && <>
                            <button onClick={() => decide.mutate({ id: r.id, status: 'APPROVED' })} className="text-xs text-emerald-600 hover:underline">Approve</button>
                            <button onClick={() => decide.mutate({ id: r.id, status: 'REJECTED' })} className="text-xs text-rose-600 hover:underline">Reject</button>
                          </>}
                          {r.status === 'APPROVED' && <button onClick={() => decide.mutate({ id: r.id, status: 'PROCESSED' })} className="text-xs text-brand-600 hover:underline">Mark processed</button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && <NewRefund onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['refunds'] }); }} />}
    </div>
  );
}

function NewRefund({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ clientName: '', amount: '', reason: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/accounts/refunds', { clientName: form.clientName, amount: form.amount, reason: form.reason || undefined })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="Request Refund" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Client name *</label><input className="input" required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></div>
        <div><label className="label">Amount (₹) *</label><input className="input" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        <div><label className="label">Reason</label><textarea className="input" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Submit Request</button>
      </form>
    </Drawer>
  );
}
