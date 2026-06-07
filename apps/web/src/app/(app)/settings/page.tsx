'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/ui';

interface OrgSettings {
  name?: string;
  supportEmail?: string;
  supportPhone?: string;
  currency?: string;
  timezone?: string;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<Record<string, OrgSettings>>('/admin/settings')).data });
  const [form, setForm] = useState<OrgSettings>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.organization) setForm(data.organization);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => (await api.put('/admin/settings/organization', { value: form })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="System Settings" subtitle="Organization & branding" />
      {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Organization</h2>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate(); }}>
            <div><label className="label">Organization name</label><input className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Medline Global" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Support email</label><input className="input" type="email" value={form.supportEmail ?? ''} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} /></div>
              <div><label className="label">Support phone</label><input className="input" value={form.supportPhone ?? ''} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Currency</label>
                <select className="input" value={form.currency ?? 'INR'} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  {['INR', 'AED', 'USD', 'SAR', 'QAR'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="label">Timezone</label><input className="input" value={form.timezone ?? ''} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Asia/Kolkata" /></div>
            </div>
            {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
            <div className="flex items-center gap-3">
              <button className="btn-primary" disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save settings</button>
              {save.isSuccess && <span className="text-sm text-emerald-600">Saved</span>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
