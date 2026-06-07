'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Loader2, Plus, User } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { cn, timeAgo } from '@/lib/utils';
import { PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { AssignableUser, Task } from '@/lib/types';

const COLUMNS = [
  { status: 'NEW', label: 'New' },
  { status: 'ASSIGNED', label: 'Assigned' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'BLOCKED', label: 'Blocked' },
  { status: 'COMPLETED', label: 'Completed' },
];

const priorityTone: Record<string, string> = {
  URGENT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export default function TasksPage() {
  const qc = useQueryClient();
  const canCreatePerm = useAuthStore((s) => s.hasPermission('task:create'));
  const canAssign = useAuthStore((s) => s.hasPermission('task:assign'));
  const canCreate = canCreatePerm || canAssign;
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', scope],
    queryFn: async () => (await api.get<Task[]>('/tasks', { params: { scope } })).data,
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; body: Record<string, unknown> }) => (await api.patch(`/tasks/${v.id}`, v.body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const byStatus = (status: string) => data?.filter((t) => t.status === status) ?? [];

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Team worklist & assignments"
        action={
          <div className="flex items-center gap-2">
            {canAssign && (
              <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                {(['all', 'mine'] as const).map((s) => (
                  <button key={s} onClick={() => setScope(s)} className={cn('rounded-md px-3 py-1 text-sm font-medium capitalize', scope === s ? 'bg-brand-600 text-white' : 'text-slate-500')}>{s}</button>
                ))}
              </div>
            )}
            {canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Task</button>}
          </div>
        }
      />

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const tasks = byStatus(col.status);
            return (
              <div key={col.status} className="rounded-2xl bg-slate-100/60 p-3 dark:bg-slate-900/40">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{col.label}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800">{tasks.length}</span>
                </div>
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{t.title}</p>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', priorityTone[t.priority])}>{t.priority}</span>
                      </div>
                      {t.description && <p className="mb-2 line-clamp-2 text-xs text-slate-500">{t.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {t.assignee && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{t.assignee.name}</span>}
                        {t.dueAt && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{timeAgo(t.dueAt)}</span>}
                      </div>
                      <div className="mt-2.5 border-t border-slate-100 pt-2 dark:border-slate-800">
                        <select
                          className="w-full rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700"
                          value={t.status}
                          onChange={(e) => update.mutate({ id: t.id, body: { status: e.target.value } })}
                        >
                          {['NEW', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && <p className="px-1 py-4 text-center text-xs text-slate-400">No tasks</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && <NewTask canAssign={canAssign} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['tasks'] }); }} />}
    </div>
  );
}

function NewTask({ canAssign, onClose, onCreated }: { canAssign: boolean; onClose: () => void; onCreated: () => void }) {
  const { data: users } = useQuery({ queryKey: ['assignable'], queryFn: async () => (await api.get<AssignableUser[]>('/users/assignable')).data, enabled: canAssign });
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', department: '', assigneeId: '', dueAt: '' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => (await api.post('/tasks', {
      title: form.title, description: form.description || undefined, priority: form.priority,
      department: form.department || undefined, assigneeId: form.assigneeId || undefined, dueAt: form.dueAt || undefined,
    })).data,
    onSuccess: onCreated,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  return (
    <Drawer title="New Task" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <div><label className="label">Title *</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div><label className="label">Due</label><input className="input" type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></div>
        </div>
        <div><label className="label">Department</label>
          <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
            <option value="">None</option>
            {['OPERATIONS', 'SALES', 'DOCUMENTATION', 'ACADEMY', 'ACCOUNTS', 'MARKETING', 'ADMINISTRATION'].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {canAssign && (
          <div><label className="label">Assign to</label>
            <select className="input" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
              <option value="">Unassigned</option>
              {users?.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.role.label}</option>)}
            </select>
          </div>
        )}
        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create Task</button>
      </form>
    </Drawer>
  );
}
