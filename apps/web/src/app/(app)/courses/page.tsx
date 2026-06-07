'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Loader2, Plus } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { Course } from '@/lib/types';

export default function CoursesPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('course:create'));
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['courses'], queryFn: async () => (await api.get<Course[]>('/academy/courses')).data });

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Exam preparation & training programs"
        action={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Course</button>}
      />

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : !data || data.length === 0 ? (
        <div className="card py-10 text-center text-sm text-slate-400">No courses yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <div key={c.id} className="card">
              <div className="mb-3 flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300">
                  <BookOpen className="h-5 w-5" />
                </span>
                <Badge tone={c.isActive ? 'green' : 'slate'}>{c.isActive ? 'Active' : 'Archived'}</Badge>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{c.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{c.category ?? c.profession ?? 'General'}{c.level ? ` · ${c.level}` : ''}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>{c.durationWeeks ? `${c.durationWeeks} wks` : '—'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{c.price ? `₹${Number(c.price).toLocaleString()}` : '—'}</span>
              </div>
              <div className="mt-3 flex gap-4 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
                <span>{c._count.batches} batches</span>
                <span>{c._count.students} students</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <NewCourse onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['courses'] }); }} />}
    </div>
  );
}

function NewCourse({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', category: '', profession: '', level: 'Beginner', durationWeeks: '', price: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/academy/courses', {
      name: form.name, category: form.category || undefined, profession: form.profession || undefined,
      level: form.level, durationWeeks: form.durationWeeks || undefined, price: form.price || undefined,
    })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Drawer title="New Course" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Course name *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="DHA Nursing Exam Preparation" /></div>
        <div><label className="label">Category</label><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Nursing" /></div>
        <div><label className="label">Profession</label><input className="input" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Level</label>
            <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {['Beginner', 'Intermediate', 'Advanced'].map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div><label className="label">Duration (wks)</label><input className="input" type="number" value={form.durationWeeks} onChange={(e) => setForm({ ...form, durationWeeks: e.target.value })} /></div>
        </div>
        <div><label className="label">Price (₹)</label><input className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create Course</button>
      </form>
    </Drawer>
  );
}
