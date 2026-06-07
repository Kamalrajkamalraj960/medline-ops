'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/ui';

export default function PortalSupportPage() {
  const [form, setForm] = useState({ subject: '', message: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/portal/support', form)).data,
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Support" subtitle="Reach your executive — we’ll get back to you" />

      {mutation.isSuccess ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-600/15 dark:text-emerald-300">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Request submitted</h2>
          <p className="max-w-sm text-sm text-slate-500">Your executive has been notified and will follow up shortly.</p>
          <button className="btn-primary mt-2" onClick={() => { mutation.reset(); setForm({ subject: '', message: '' }); }}>New request</button>
        </div>
      ) : (
        <div className="card">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
            <div><label className="label">Subject *</label><input className="input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Question about my DHA submission" /></div>
            <div><label className="label">Message *</label><textarea className="input" rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe how we can help…" /></div>
            {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
            <button className="btn-primary w-full" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit request
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
