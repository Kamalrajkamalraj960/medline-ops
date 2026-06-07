'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { inr } from '@/lib/utils';
import { Badge, PageHeader } from '@/components/ui';
import type { Closure } from '@/lib/types';

const tone = (s: string): 'green' | 'amber' | 'rose' => s === 'SETTLED' ? 'green' : s === 'PARTIAL' ? 'amber' : 'rose';

export default function ClosuresPage() {
  const { data, isLoading } = useQuery({ queryKey: ['closures'], queryFn: async () => (await api.get<Closure[]>('/accounts/closures')).data });

  const totals = (data ?? []).reduce(
    (acc, c) => ({ invoiced: acc.invoiced + c.invoiced, paid: acc.paid + c.paid, balance: acc.balance + c.balance }),
    { invoiced: 0, paid: 0, balance: 0 },
  );

  return (
    <div>
      <PageHeader title="Account Closures" subtitle="Per-client billing status & outstanding balances" />
      <div className="card">
        {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No client accounts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium text-right">Invoices</th>
                  <th className="pb-2 font-medium text-right">Invoiced</th>
                  <th className="pb-2 font-medium text-right">Paid</th>
                  <th className="pb-2 font-medium text-right">Balance</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.client} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{c.client}</td>
                    <td className="py-3 text-right text-slate-500">{c.invoiceCount}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{inr(c.invoiced)}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-200">{inr(c.paid)}</td>
                    <td className="py-3 text-right font-semibold text-slate-900 dark:text-white">{inr(c.balance)}</td>
                    <td className="py-3"><Badge tone={tone(c.status)}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-semibold dark:border-slate-700">
                  <td className="py-3 text-slate-900 dark:text-white">Total</td>
                  <td />
                  <td className="py-3 text-right text-slate-900 dark:text-white">{inr(totals.invoiced)}</td>
                  <td className="py-3 text-right text-slate-900 dark:text-white">{inr(totals.paid)}</td>
                  <td className="py-3 text-right text-slate-900 dark:text-white">{inr(totals.balance)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
