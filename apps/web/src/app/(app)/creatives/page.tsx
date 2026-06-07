'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Image as ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { CreativeAsset } from '@/lib/types';

const TYPES = ['Image', 'Video', 'Brochure', 'Flyer', 'Template', 'Ad Copy', 'Landing Page'];
const statusTone = (s: string): 'green' | 'amber' | 'slate' => s === 'APPROVED' ? 'green' : s === 'ARCHIVED' ? 'slate' : 'amber';

export default function CreativesPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('campaign:create'));
  const canEdit = useAuthStore((s) => s.hasPermission('campaign:edit'));
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['creatives'], queryFn: async () => (await api.get<CreativeAsset[]>('/marketing/creatives')).data });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['creatives'] });
  const update = useMutation({ mutationFn: async (v: { id: string; status: string }) => (await api.patch(`/marketing/creatives/${v.id}`, { status: v.status })).data, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: async (id: string) => (await api.delete(`/marketing/creatives/${id}`)).data, onSuccess: invalidate });

  return (
    <div>
      <PageHeader
        title="Creative Library"
        subtitle="Approved assets, templates & ad copy"
        action={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Asset</button>}
      />
      {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !data || data.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No creative assets yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <div key={c.id} className="card">
              <div className="mb-3 flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-600/15 dark:text-violet-300"><ImageIcon className="h-5 w-5" /></span>
                <Badge tone={statusTone(c.status)}>{c.status}</Badge>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{c.name}</h3>
              <p className="text-sm text-slate-500">{c.type}{c.category ? ` · ${c.category}` : ''}</p>
              {c.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.tags.map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">{t}</span>)}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                {c.url ? (
                  <a href={c.url.startsWith('http') ? c.url : '#'} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Open</a>
                ) : <span className="text-xs text-slate-400">No link</span>}
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {c.status !== 'APPROVED' && <button onClick={() => update.mutate({ id: c.id, status: 'APPROVED' })} className="text-xs text-emerald-600 hover:underline">Approve</button>}
                    {c.status !== 'ARCHIVED' && <button onClick={() => update.mutate({ id: c.id, status: 'ARCHIVED' })} className="text-xs text-slate-500 hover:underline">Archive</button>}
                    <button onClick={() => remove.mutate(c.id)} className="text-rose-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && <NewCreative onClose={() => setOpen(false)} onCreated={() => { setOpen(false); invalidate(); }} />}
    </div>
  );
}

function NewCreative({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', type: 'Image', category: '', url: '', tags: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/marketing/creatives', {
      name: form.name, type: form.type, category: form.category || undefined, url: form.url || undefined,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="Add Creative Asset" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Type</label>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="label">Category</label><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="DHA Nursing" /></div>
        <div><label className="label">Link / URL</label><input className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" /></div>
        <div><label className="label">Tags (comma separated)</label><input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="facebook, q3, video" /></div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add Asset</button>
      </form>
    </Drawer>
  );
}
