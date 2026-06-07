'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, X } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { PageHeader, StatusBadge } from '@/components/ui';
import type { Lead } from '@/lib/types';

interface LeadList {
  items: Lead[];
  total: number;
  page: number;
  totalPages: number;
}

export default function LeadsPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('lead:create'));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leads', search],
    queryFn: async () => (await api.get<LeadList>('/leads', { params: { search: search || undefined } })).data,
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Central CRM lead management"
        action={
          canCreate && (
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New Lead
            </button>
          )
        }
      />

      <div className="card">
        <input
          className="input mb-4 max-w-sm"
          placeholder="Search name, phone, email, reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No leads found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Reference</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Service</th>
                  <th className="pb-2 font-medium">Owner</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-2.5 font-mono text-xs text-slate-500">{lead.reference}</td>
                    <td className="py-2.5 font-medium text-slate-900 dark:text-white">{lead.name}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{lead.phone}</td>
                    <td className="py-2.5 capitalize text-slate-600 dark:text-slate-300">{lead.serviceType}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{lead.owner?.name ?? '—'}</td>
                    <td className="py-2.5"><StatusBadge status={lead.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <NewLeadDrawer
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['leads'] });
            qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
          }}
        />
      )}
    </div>
  );
}

function NewLeadDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    profession: '',
    serviceType: 'consultancy' as 'consultancy' | 'academy',
    urgency: 'WITHIN_3_MONTHS',
    forceCreate: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [dupWarning, setDupWarning] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/leads', form)).data,
    onSuccess: onCreated,
    onError: (err: unknown) => {
      const msg = apiErrorMessage(err, 'Failed to create lead');
      if (msg.toLowerCase().includes('duplicate')) {
        setDupWarning('Possible duplicate detected. Click Create again to proceed anyway.');
        setForm((f) => ({ ...f, forceCreate: true }));
      } else {
        setError(msg);
      }
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Lead</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          <div>
            <label className="label">Full name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone *</label>
            <input className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Profession</label>
            <input className="input" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
          </div>

          <div>
            <label className="label">Service Type *</label>
            {/* The ONLY two options — "Both" is intentionally absent. */}
            <div className="grid grid-cols-2 gap-2">
              {(['consultancy', 'academy'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setForm({ ...form, serviceType: st })}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ${
                    form.serviceType === st
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                      : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Urgency</label>
            <select className="input" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
              <option value="IMMEDIATE">Immediate</option>
              <option value="WITHIN_3_MONTHS">Within 3 months</option>
              <option value="WITHIN_6_MONTHS">Within 6 months</option>
              <option value="JUST_EXPLORING">Just exploring</option>
            </select>
          </div>

          {dupWarning && (
            <div className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {dupWarning}
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {form.forceCreate ? 'Create anyway' : 'Create Lead'}
          </button>
        </form>
      </div>
    </div>
  );
}
