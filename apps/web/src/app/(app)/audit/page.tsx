'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, PageHeader } from '@/components/ui';
import type { AuditEntry } from '@/lib/types';

interface AuditList { items: AuditEntry[]; total: number; page: number; totalPages: number }

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, search],
    queryFn: async () => (await api.get<AuditList>('/admin/audit', { params: { page, search: search || undefined } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Every critical action, who did it, and when" />
      <div className="card">
        <input
          className="input mb-4 max-w-sm"
          placeholder="Search action, resource, or user…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !data || data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No audit entries.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <th className="pb-2 font-medium">Action</th>
                    <th className="pb-2 font-medium">Resource</th>
                    <th className="pb-2 font-medium">Actor</th>
                    <th className="pb-2 font-medium">IP</th>
                    <th className="pb-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                      <td className="py-2.5"><Badge tone="slate">{a.action.replaceAll('_', ' ')}</Badge></td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                        {a.resource}{a.resourceId && <span className="ml-1 font-mono text-xs text-slate-400">{a.resourceId.slice(0, 8)}</span>}
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-200">{a.actor?.name ?? 'system'}</td>
                      <td className="py-2.5 font-mono text-xs text-slate-400">{a.ipAddress ?? '—'}</td>
                      <td className="py-2.5 text-slate-500">{new Date(a.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>{data.total} entries · page {data.page}/{data.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronLeft className="h-4 w-4" /></button>
                <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-700"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
