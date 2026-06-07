'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Loader2, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, PageHeader, ProgressBar } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { Batch, Course, Student } from '@/lib/types';

interface StudentList { items: Student[]; total: number; totalPages: number }

const studentTone = (s: string): 'green' | 'blue' | 'amber' | 'slate' | 'rose' =>
  s === 'ACTIVE' ? 'green' : s === 'COMPLETED' ? 'blue' : s === 'ON_HOLD' ? 'amber' : ['DROPPED', 'CANCELLED'].includes(s) ? 'rose' : 'slate';

export default function StudentsPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('student:create'));
  const canEdit = useAuthStore((s) => s.hasPermission('student:edit'));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['students', search],
    queryFn: async () => (await api.get<StudentList>('/academy/students', { params: { search: search || undefined } })).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['students'] });
  const update = useMutation({
    mutationFn: async (v: { id: string; body: Record<string, unknown> }) => (await api.patch(`/academy/students/${v.id}`, v.body)).data,
    onSuccess: invalidate,
  });

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Enrollments, progress & certification"
        action={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Enroll Student</button>}
      />

      <div className="card">
        <input className="input mb-4 max-w-sm" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No students yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Ref</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Course / Batch</th>
                  <th className="pb-2 font-medium w-32">Progress</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3 font-mono text-xs text-slate-500">{s.reference}</td>
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{s.name}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{s.course?.name ?? '—'}{s.batch ? ` · ${s.batch.code}` : ''}</td>
                    <td className="py-3"><div className="flex items-center gap-2"><ProgressBar value={s.progressPct} /><span className="w-8 text-right text-xs text-slate-400">{s.progressPct}%</span></div></td>
                    <td className="py-3">
                      {canEdit ? (
                        <select className="rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700" value={s.status} onChange={(e) => update.mutate({ id: s.id, body: { status: e.target.value } })}>
                          {['ENROLLED', 'ACTIVE', 'COMPLETED', 'DROPPED', 'ON_HOLD', 'CANCELLED'].map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      ) : <Badge tone={studentTone(s.status)}>{s.status}</Badge>}
                    </td>
                    <td className="py-3 text-right">
                      {canEdit && !s.certificateIssuedAt && (
                        <button title="Issue certificate" onClick={() => update.mutate({ id: s.id, body: { issueCertificate: true } })} className="rounded-lg p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"><Award className="h-4 w-4" /></button>
                      )}
                      {s.certificateIssuedAt && <Badge tone="green">Certified</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <EnrollStudent onClose={() => setOpen(false)} onCreated={() => { setOpen(false); invalidate(); }} />}
    </div>
  );
}

function EnrollStudent({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: async () => (await api.get<Course[]>('/academy/courses')).data });
  const { data: batches } = useQuery({ queryKey: ['batches'], queryFn: async () => (await api.get<Batch[]>('/academy/batches')).data });
  const [form, setForm] = useState({ name: '', courseId: '', batchId: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/academy/students', {
      name: form.name, courseId: form.courseId || undefined, batchId: form.batchId || undefined,
    })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="Enroll Student" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Student name *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Course</label>
          <select className="input" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
            <option value="">Select course…</option>
            {courses?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className="label">Batch</label>
          <select className="input" value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
            <option value="">Allocate later</option>
            {batches?.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.course?.name}</option>)}
          </select>
        </div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Enroll</button>
      </form>
    </Drawer>
  );
}
