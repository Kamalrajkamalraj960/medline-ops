'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { inr } from '@/lib/utils';
import { Badge, PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { Invoice, Payment } from '@/lib/types';

interface PaymentList { items: Payment[]; total: number; totalPages: number }

const payTone = (s: string): 'green' | 'amber' | 'rose' | 'slate' =>
  s === 'CONFIRMED' ? 'green' : s === 'PENDING' ? 'amber' : ['FAILED', 'CANCELLED', 'REFUNDED'].includes(s) ? 'rose' : 'slate';

export default function PaymentsPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('payment:create'));
  const canEdit = useAuthStore((s) => s.hasPermission('payment:edit'));
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['payments'], queryFn: async () => (await api.get<PaymentList>('/accounts/payments')).data });

  const confirm = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/accounts/payments/${id}/confirm`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); qc.invalidateQueries({ queryKey: ['invoices'] }); },
  });

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Collections & payment verification"
        action={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Record Payment</button>}
      />
      <div className="card">
        {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !data || data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Reference</th>
                  <th className="pb-2 font-medium">Payer</th>
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 font-mono text-xs text-slate-500">{p.reference}</td>
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{p.payerName}</td>
                    <td className="py-3 font-mono text-xs text-slate-500">{p.invoice?.number ?? '—'}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{p.method.replaceAll('_', ' ')}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{inr(p.amount)}</td>
                    <td className="py-3"><Badge tone={payTone(p.status)}>{p.status}</Badge></td>
                    <td className="py-3 text-right">
                      {canEdit && p.status === 'PENDING' && (
                        <button onClick={() => confirm.mutate(p.id)} className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"><CheckCircle2 className="h-3.5 w-3.5" /> Confirm</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && <NewPayment onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['payments'] }); }} />}
    </div>
  );
}

function NewPayment({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: invoices } = useQuery({ queryKey: ['invoices', ''], queryFn: async () => (await api.get<{ items: Invoice[] }>('/accounts/invoices')).data });
  const [form, setForm] = useState({ payerName: '', invoiceId: '', amount: '', method: 'UPI', confirmed: true });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/accounts/payments', {
      payerName: form.payerName, invoiceId: form.invoiceId || undefined,
      amount: form.amount, method: form.method, confirmed: form.confirmed,
    })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="Record Payment" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Payer name *</label><input className="input" required value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })} /></div>
        <div><label className="label">Against invoice</label>
          <select className="input" value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
            <option value="">No invoice</option>
            {invoices?.items.map((i) => <option key={i.id} value={i.id}>{i.number} — {i.clientName}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Amount (₹) *</label><input className="input" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><label className="label">Method</label>
            <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {['UPI', 'BANK_TRANSFER', 'CASH', 'ONLINE_GATEWAY', 'CHEQUE', 'CARD'].map((m) => <option key={m} value={m}>{m.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={form.confirmed} onChange={(e) => setForm({ ...form, confirmed: e.target.checked })} /> Mark as confirmed
        </label>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Record Payment</button>
      </form>
    </Drawer>
  );
}
