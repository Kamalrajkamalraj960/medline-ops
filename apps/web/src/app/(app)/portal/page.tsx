'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Mail, Phone, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { inr, cn } from '@/lib/utils';
import { Badge, KpiCard, PageHeader, ProgressBar } from '@/components/ui';
import type { PortalOverview } from '@/lib/types';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function PortalHome() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['portal-overview'],
    queryFn: async () => (await api.get<PortalOverview>('/portal/overview')).data,
  });

  if (isError) {
    const msg = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
    return (
      <div className="card text-center text-sm text-slate-500">
        {msg ?? 'No application linked to your account yet.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting()}, ${user?.name?.split(' ')[0] ?? ''} 👋`} subtitle="Your application at a glance" />

      {isLoading || !data ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Progress" value={`${data.application.progressPct}%`} icon="TrendingUp" accent="brand" />
            <KpiCard label="Documents Verified" value={`${data.documents.verified}/${data.documents.total}`} icon="FileCheck" accent="green" delay={0.05} />
            <KpiCard label="Balance Due" value={inr(data.payment.balance)} icon="CreditCard" accent="amber" delay={0.1} />
            <KpiCard label="Authority" value={data.application.authority ?? data.application.course ?? '—'} icon="Landmark" accent="violet" delay={0.15} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Journey */}
            <div className="card lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Application Journey</h2>
                <span className="font-mono text-xs text-slate-400">{data.application.reference}</span>
              </div>
              <div className="mb-5"><ProgressBar value={data.application.progressPct} /></div>

              {data.journey.length > 0 ? (
                <ol className="relative space-y-1 border-l border-slate-200 pl-6 dark:border-slate-700">
                  {data.journey.map((s) => (
                    <li key={s.step} className="relative pb-4">
                      <span
                        className={cn(
                          'absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                          s.state === 'done' && 'bg-emerald-500 text-white',
                          s.state === 'current' && 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/40',
                          s.state === 'upcoming' && 'bg-slate-200 text-slate-500 dark:bg-slate-700',
                        )}
                      >
                        {s.state === 'done' ? <Check className="h-3.5 w-3.5" /> : s.step}
                      </span>
                      <p className={cn('text-sm', s.state === 'upcoming' ? 'text-slate-400' : 'font-medium text-slate-800 dark:text-slate-200')}>
                        {s.label}
                      </p>
                      {s.state === 'current' && <p className="text-xs text-brand-600">In progress</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-sm text-slate-500">
                  <p>Course: <span className="font-medium text-slate-800 dark:text-slate-200">{data.application.course ?? '—'}</span></p>
                  <p className="mt-1">Batch: {data.application.batch ?? 'To be allocated'}</p>
                  <p className="mt-1">Status: <Badge tone="blue">{data.application.stage.replaceAll('_', ' ')}</Badge></p>
                </div>
              )}
            </div>

            {/* Executive contact */}
            <div className="card h-fit">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Your Executive</h2>
              {data.executive ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-semibold text-white">
                      {data.executive.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{data.executive.name}</p>
                      <p className="text-xs text-slate-400">Sales Executive</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {data.executive.phone && (
                      <a href={`tel:${data.executive.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-brand-600 dark:text-slate-300"><Phone className="h-4 w-4" /> {data.executive.phone}</a>
                    )}
                    <a href={`mailto:${data.executive.email}`} className="flex items-center gap-2 text-slate-600 hover:text-brand-600 dark:text-slate-300"><Mail className="h-4 w-4" /> {data.executive.email}</a>
                    {data.executive.phone && (
                      <a href={`https://wa.me/${data.executive.phone.replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 dark:text-slate-300"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No executive assigned yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
