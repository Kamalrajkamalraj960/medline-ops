'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { inr } from '@/lib/utils';
import { Badge, PageHeader } from '@/components/ui';
import type { PortalInvoice } from '@/lib/types';

const invTone = (s: string): 'green' | 'blue' | 'amber' | 'rose' | 'slate' =>
  s === 'PAID' ? 'green' : s === 'ISSUED' ? 'blue' : s === 'PARTIALLY_PAID' ? 'amber' : s === 'OVERDUE' ? 'rose' : 'slate';

export default function PortalPaymentsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['portal-payments'], queryFn: async () => (await api.get<PortalInvoice[]>('/portal/payments')).data });

  return (
    <div>
      <PageHeader title="Payments" subtitle="Invoices, installments & receipts" />
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : !data || data.length === 0 ? (
        <div className="card py-8 text-center text-sm text-slate-400">No invoices yet.</div>
      ) : (
        <div className="space-y-4">
          {data.map((inv) => {
            const paid = inv.payments.filter((p) => p.status === 'CONFIRMED').reduce((s, p) => s + Number(p.amount), 0);
            const total = Number(inv.amount) + Number(inv.gstAmount);
            return (
              <div key={inv.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-slate-400">{inv.number}</p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{inr(total)}</p>
                    <p className="text-xs text-slate-500">incl. GST {inr(inv.gstAmount)}</p>
                  </div>
                  <div className="text-right">
                    <Badge tone={invTone(inv.status)}>{inv.status.replaceAll('_', ' ')}</Badge>
                    <p className="mt-2 text-sm text-slate-500">Paid {inr(paid)} · Balance <span className="font-semibold text-slate-900 dark:text-white">{inr(total - paid)}</span></p>
                  </div>
                </div>

                {inv.payments.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Payment history</p>
                    <ul className="space-y-1.5">
                      {inv.payments.map((p) => (
                        <li key={p.reference} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">{p.method.replaceAll('_', ' ')} · <span className="font-mono text-xs text-slate-400">{p.reference}</span></span>
                          <span className="flex items-center gap-2">
                            <span className="text-slate-700 dark:text-slate-200">{inr(p.amount)}</span>
                            <Badge tone={p.status === 'CONFIRMED' ? 'green' : 'amber'}>{p.status}</Badge>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
