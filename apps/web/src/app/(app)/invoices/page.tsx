'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Send } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { inr } from '@/lib/utils';
import { Badge, PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { Invoice } from '@/lib/types';

interface InvoiceList { items: Invoice[]; total: number; totalPages: number }

const invTone = (s: string): 'green' | 'blue' | 'amber' | 'rose' | 'slate' =>
  s === 'PAID' ? 'green' : s === 'ISSUED' ? 'blue' : s === 'PARTIALLY_PAID' ? 'amber' : s === 'OVERDUE' || s === 'CANCELLED' ? 'rose' : 'slate';

export default function InvoicesPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('invoice:create'));
  const canEdit = useAuthStore((s) => s.hasPermission('invoice:edit'));
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', status],
    queryFn: async () => (await api.get<InvoiceList>('/accounts/invoices', { params: { status: status || undefined } })).data,
  });

  const issue = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/accounts/invoices/${id}`, { status: 'ISSUED' })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Billing & outstanding tracking"
        action={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Invoice</button>}
      />
      <div className="card">
        <select className="input mb-4 max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'].map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
        </select>
        {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !data || data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Number</th>
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium text-right">GST</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => (
                  <tr key={i.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 font-mono text-xs text-slate-500">{i.number}</td>
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{i.clientName}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{inr(i.amount)}</td>
                    <td className="py-3 text-right text-slate-500">{inr(i.gstAmount)}</td>
                    <td className="py-3"><Badge tone={invTone(i.status)}>{i.status.replaceAll('_', ' ')}</Badge></td>
                    <td className="py-3 text-right">
                      {canEdit && i.status === 'DRAFT' && (
                        <button onClick={() => issue.mutate(i.id)} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"><Send className="h-3.5 w-3.5" /> Issue</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && <NewInvoice onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['invoices'] }); }} />}
    </div>
  );
}

function NewInvoice({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ clientName: '', amount: '', gstAmount: '', dueAt: '', issue: true });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/accounts/invoices', {
      clientName: form.clientName, amount: form.amount, gstAmount: form.gstAmount || 0,
      dueAt: form.dueAt || undefined, issue: form.issue,
    })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="New Invoice" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Client name *</label><input className="input" required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Amount (₹) *</label><input className="input" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><label className="label">GST (₹)</label><input className="input" type="number" value={form.gstAmount} onChange={(e) => setForm({ ...form, gstAmount: e.target.value })} /></div>
        </div>
        <div><label className="label">Due date</label><input className="input" type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.checked })} /> Issue immediately
        </label>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create Invoice</button>
      </form>
    </Drawer>
  );
}
