'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, KeyRound } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { timeAgo } from '@/lib/utils';
import { Badge, PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { AdminUser, DeptOption, RoleOption } from '@/lib/types';

export default function UsersPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('user:create'));
  const canEdit = useAuthStore((s) => s.hasPermission('user:edit'));
  const me = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<AdminUser[]>('/users')).data });

  const update = useMutation({
    mutationFn: async (v: { id: string; body: Record<string, unknown> }) => (await api.patch(`/users/${v.id}`, v.body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const resetPassword = (id: string) => {
    const pw = window.prompt('New password (min 4 chars):');
    if (pw && pw.length >= 4) update.mutate({ id, body: { password: pw } });
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage accounts, roles & access"
        action={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New User</button>}
      />
      <div className="card">
        {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Department</th>
                  <th className="pb-2 font-medium">Last login</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {data?.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{u.role.label}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{u.department?.label ?? '—'}</td>
                    <td className="py-3 text-slate-500">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'never'}</td>
                    <td className="py-3"><Badge tone={u.status === 'ACTIVE' ? 'green' : u.status === 'SUSPENDED' ? 'rose' : 'amber'}>{u.status}</Badge></td>
                    <td className="py-3 text-right">
                      {canEdit && u.id !== me?.id && (
                        <div className="inline-flex items-center gap-3">
                          <button title="Reset password" onClick={() => resetPassword(u.id)} className="text-slate-400 hover:text-brand-600"><KeyRound className="h-4 w-4" /></button>
                          <button
                            onClick={() => update.mutate({ id: u.id, body: { status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } })}
                            className={`text-xs hover:underline ${u.status === 'ACTIVE' ? 'text-rose-600' : 'text-emerald-600'}`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && <NewUser onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['users'] }); }} />}
    </div>
  );
}

function NewUser({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: options } = useQuery({ queryKey: ['user-options'], queryFn: async () => (await api.get<{ roles: RoleOption[]; departments: DeptOption[] }>('/users/options')).data });
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '', departmentId: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/users', {
      name: form.name, email: form.email, password: form.password,
      roleId: form.roleId, departmentId: form.departmentId || undefined, phone: form.phone || undefined,
    })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="New User" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Full name *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Email *</label><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="label">Temporary password *</label><input className="input" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div><label className="label">Role *</label>
          <select className="input" required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
            <option value="">Select role…</option>
            {options?.roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div><label className="label">Department</label>
          <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
            <option value="">None</option>
            {options?.departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create User</button>
      </form>
    </Drawer>
  );
}
