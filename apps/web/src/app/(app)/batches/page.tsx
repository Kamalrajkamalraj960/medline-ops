'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { Batch, Course, Faculty } from '@/lib/types';

const batchTone = (s: string): 'green' | 'blue' | 'slate' | 'rose' =>
  s === 'ACTIVE' ? 'green' : s === 'UPCOMING' ? 'blue' : s === 'CANCELLED' ? 'rose' : 'slate';

export default function BatchesPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('batch:create'));
  const canEdit = useAuthStore((s) => s.hasPermission('batch:edit'));
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['batches'], queryFn: async () => (await api.get<Batch[]>('/academy/batches')).data });

  const statusMutation = useMutation({
    mutationFn: async (v: { id: string; status: string }) => (await api.patch(`/academy/batches/${v.id}`, { status: v.status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  });

  return (
    <div>
      <PageHeader
        title="Batches"
        subtitle="Scheduled cohorts with faculty & seats"
        action={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Batch</button>}
      />

      <div className="card">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No batches yet. Create a course first, then a batch.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Course</th>
                  <th className="pb-2 font-medium">Faculty</th>
                  <th className="pb-2 font-medium">Timing</th>
                  <th className="pb-2 font-medium">Seats</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 font-mono text-xs text-slate-500">{b.code}</td>
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{b.course?.name ?? '—'}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{b.faculty?.name ?? 'Unassigned'}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{b.timing ?? '—'}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{b._count.students}/{b.seatLimit || '∞'}</td>
                    <td className="py-3">
                      {canEdit ? (
                        <select
                          className="rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700"
                          value={b.status}
                          onChange={(e) => statusMutation.mutate({ id: b.id, status: e.target.value })}
                        >
                          {['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <Badge tone={batchTone(b.status)}>{b.status}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <NewBatch onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['batches'] }); }} />}
    </div>
  );
}

function NewBatch({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: async () => (await api.get<Course[]>('/academy/courses')).data });
  const { data: faculty } = useQuery({ queryKey: ['faculty'], queryFn: async () => (await api.get<Faculty[]>('/academy/faculty')).data });
  const [form, setForm] = useState({ courseId: '', facultyId: '', timing: '', seatLimit: '30', startDate: '' });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/academy/batches', {
      courseId: form.courseId, facultyId: form.facultyId || undefined,
      timing: form.timing || undefined, seatLimit: form.seatLimit || 0,
      startDate: form.startDate || undefined,
    })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Drawer title="New Batch" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Course *</label>
          <select className="input" required value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
            <option value="">Select course…</option>
            {courses?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className="label">Faculty</label>
          <select className="input" value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })}>
            <option value="">Unassigned</option>
            {faculty?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div><label className="label">Timing</label><input className="input" value={form.timing} onChange={(e) => setForm({ ...form, timing: e.target.value })} placeholder="Mon-Fri 7-9 PM" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Seat limit</label><input className="input" type="number" value={form.seatLimit} onChange={(e) => setForm({ ...form, seatLimit: e.target.value })} /></div>
          <div><label className="label">Start date</label><input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
        </div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending || !form.courseId}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create Batch</button>
      </form>
    </Drawer>
  );
}
