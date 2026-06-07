'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { inr } from '@/lib/utils';
import { KpiCard } from '@/components/ui';

interface AccountsStats {
  revenueMTD: number;
  pendingCollections: number;
  outstandingInvoices: number;
  gstCollected: number;
  refundRequests: number;
  paymentsThisMonth: number;
}

export function AccountsDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['accounts-stats'], queryFn: async () => (await api.get<AccountsStats>('/accounts/stats')).data });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Revenue (MTD)" value={isLoading ? '—' : inr(data!.revenueMTD)} icon="TrendingUp" accent="green" />
        <KpiCard label="Pending Collections" value={isLoading ? '—' : inr(data!.pendingCollections)} icon="Clock" accent="amber" delay={0.05} />
        <KpiCard label="Outstanding Invoices" value={isLoading ? '—' : data!.outstandingInvoices} icon="FileText" accent="rose" delay={0.1} />
        <KpiCard label="GST Collected" value={isLoading ? '—' : inr(data!.gstCollected)} icon="Percent" accent="violet" delay={0.15} />
        <KpiCard label="Refund Requests" value={isLoading ? '—' : data!.refundRequests} icon="Undo2" accent="amber" delay={0.2} />
        <KpiCard label="Payments (Month)" value={isLoading ? '—' : data!.paymentsThisMonth} icon="CreditCard" accent="brand" delay={0.25} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { href: '/invoices', label: 'Invoices' },
          { href: '/payments', label: 'Payments' },
          { href: '/gst', label: 'GST' },
          { href: '/refunds', label: 'Refunds' },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="card text-center transition hover:border-brand-400 hover:shadow-md">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.label} →</p>
          </Link>
        ))}
      </div>
    </>
  );
}
