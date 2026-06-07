'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, X, ChevronRight } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, PageHeader, ProgressBar } from '@/components/ui';
import type { CaseStage, ConsultancyCaseRow } from '@/lib/types';

interface CaseList {
  items: ConsultancyCaseRow[];
  total: number;
  totalPages: number;
}
interface Meta {
  stages: CaseStage[];
  authorities: string[];
  documentCategories: string[];
}

const statusTone = (s: string): 'slate' | 'blue' | 'amber' | 'green' | 'rose' | 'violet' => {
  if (['COMPLETED'].includes(s)) return 'green';
  if (['REJECTED', 'CLOSED'].includes(s)) return 'rose';
  if (['SUBMITTED', 'UNDER_REVIEW'].includes(s)) return 'blue';
  if (['ADDITIONAL_DOCS_REQUIRED', 'DOCUMENT_COLLECTION'].includes(s)) return 'amber';
  if (['ELIGIBILITY_RECEIVED', 'EXAM_SCHEDULED', 'EXAM_PASSED', 'LICENSE_PROCESSING'].includes(s)) return 'violet';
  return 'slate';
};

export default function ConsultancyCasesPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('case:create'));
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [authority, setAuthority] = useState('');
  const [search, setSearch] = useState('');

  const { data: meta } = useQuery({ queryKey: ['case-meta'], queryFn: async () => (await api.get<Meta>('/consultancy/meta')).data });
  const { data, isLoading } = useQuery({
    queryKey: ['cases', status, authority, search],
    queryFn: async () =>
      (await api.get<CaseList>('/consultancy', { params: { status: status || undefined, authority: authority || undefined, search: search || undefined } })).data,
  });

  return (
    <div>
      <PageHeader
        title="Consultancy Cases"
        subtitle="Licensing cases — collection, verification, submission & authority tracking"
        action={canCreate && (
          <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Case</button>
        )}
      />

      <div className="card">
        <div className="mb-4 flex flex-wrap gap-2">
          <input className="input max-w-xs" placeholder="Search reference, client, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {meta?.stages.map((s) => <option key={s.status} value={s.status}>{s.label}</option>)}
          </select>
          <select className="input max-w-[180px]" value={authority} onChange={(e) => setAuthority(e.target.value)}>
            <option value="">All authorities</option>
            {meta?.authorities.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No cases found. Create one from a converted consultancy lead.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Case</th>
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Authority</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium w-40">Progress</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 font-mono text-xs text-slate-500">{c.reference}</td>
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{c.lead.name}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{c.authority}</td>
                    <td className="py-3"><Badge tone={statusTone(c.status)}>{c.status.replaceAll('_', ' ')}</Badge></td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={c.progressPct} />
                        <span className="w-9 text-right text-xs text-slate-400">{c.progressPct}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <Link href={`/consultancy/${c.id}`} className="inline-flex items-center text-brand-600 hover:underline">
                        Open <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && meta && (
        <NewCaseDrawer
          authorities={meta.authorities}
          onClose={() => setOpen(false)}
          onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['cases'] }); }}
        />
      )}
    </div>
  );
}

function NewCaseDrawer({ authorities, onClose, onCreated }: { authorities: string[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ clientName: '', authority: authorities[0] ?? 'DHA', profession: '', priority: 'MEDIUM' });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/consultancy', form)).data,
    onSuccess: onCreated,
    onError: (err) => setError(apiErrorMessage(err, 'Failed to create case')),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Consultancy Case</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
          <div>
            <label className="label">Client name *</label>
            <input className="input" required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            <p className="mt-1 text-xs text-slate-400">Creates a backing consultancy lead in the documentation stage.</p>
          </div>
          <div>
            <label className="label">Authority *</label>
            <select className="input" value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })}>
              {authorities.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Profession</label>
            <input className="input" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create Case
          </button>
        </form>
      </div>
    </div>
  );
}
