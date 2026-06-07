'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Star } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { Faculty } from '@/lib/types';

export default function FacultyPage() {
  const qc = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission('faculty:manage'));
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['faculty'], queryFn: async () => (await api.get<Faculty[]>('/academy/faculty')).data });

  return (
    <div>
      <PageHeader
        title="Faculty"
        subtitle="Trainers & subject experts"
        action={canManage && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Faculty</button>}
      />

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : !data || data.length === 0 ? (
        <div className="card py-10 text-center text-sm text-slate-400">No faculty yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((f) => (
            <div key={f.id} className="card flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-700 dark:bg-violet-600/15 dark:text-violet-300">
                {f.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-slate-900 dark:text-white">{f.name}</h3>
                <p className="truncate text-sm text-slate-500">{f.specialization ?? 'General'}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span>{f.experienceYears ?? 0} yrs</span>
                  <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {f.rating ?? '—'}</span>
                  <span>{f._count.batches} batches</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <NewFaculty onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['faculty'] }); }} />}
    </div>
  );
}

function NewFaculty({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', specialization: '', experienceYears: '', rating: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/academy/faculty', {
      name: form.name, specialization: form.specialization || undefined,
      experienceYears: form.experienceYears || undefined, rating: form.rating || undefined,
    })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="Add Faculty" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Specialization</label><input className="input" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Nursing, Pharmacology…" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Experience (yrs)</label><input className="input" type="number" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} /></div>
          <div><label className="label">Rating (0-5)</label><input className="input" type="number" step="0.1" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
        </div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add Faculty</button>
      </form>
    </Drawer>
  );
}
