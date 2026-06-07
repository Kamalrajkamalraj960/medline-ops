'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Workflow, Zap } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { Badge, PageHeader } from '@/components/ui';
import { Drawer } from '@/components/drawer';
import type { AutomationAction, AutomationCondition, AutomationMeta, AutomationRule } from '@/lib/types';

const DEPARTMENTS = ['OPERATIONS', 'SALES', 'DOCUMENTATION', 'ACADEMY', 'ACCOUNTS', 'MARKETING', 'ADMINISTRATION'];
const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
const OPS = [
  { v: 'eq', l: '=' }, { v: 'neq', l: '≠' }, { v: 'contains', l: 'contains' }, { v: 'gt', l: '>' }, { v: 'lt', l: '<' },
];

export default function AutomationPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [open, setOpen] = useState(false);

  const { data: meta } = useQuery({ queryKey: ['automation-meta'], queryFn: async () => (await api.get<AutomationMeta>('/automation/meta')).data });
  const { data: rules, isLoading } = useQuery({ queryKey: ['automation'], queryFn: async () => (await api.get<AutomationRule[]>('/automation')).data });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['automation'] });
  const toggle = useMutation({
    mutationFn: async (r: AutomationRule) => (await api.patch(`/automation/${r.id}`, { isActive: !r.isActive })).data,
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/automation/${id}`)).data,
    onSuccess: invalidate,
  });

  const triggerLabel = (key: string) => meta?.triggers.find((t) => t.key === key)?.label ?? key;

  return (
    <div>
      <PageHeader
        title="Automation"
        subtitle="Event-driven workflow rules"
        action={<button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> New Rule</button>}
      />

      {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !rules || rules.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300"><Workflow className="h-7 w-7" /></span>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No automation rules yet</h2>
          <p className="max-w-md text-sm text-slate-500">Create a rule like “When a lead is created, notify the manager” or “When a document is rejected, alert the client’s executive”.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rules.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-600/15 dark:text-amber-300"><Zap className="h-5 w-5" /></span>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{r.name}</h3>
                    <p className="text-xs text-slate-400">On {triggerLabel(r.trigger)}</p>
                  </div>
                </div>
                <button onClick={() => toggle.mutate(r)}><Badge tone={r.isActive ? 'green' : 'slate'}>{r.isActive ? 'Active' : 'Paused'}</Badge></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(r.definition.actions ?? []).map((a, i) => (
                  <span key={i} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{a.type.replaceAll('_', ' ')}</span>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button onClick={() => { setEditing(r); setOpen(true); }} className="text-sm text-brand-600 hover:underline">Edit</button>
                <button onClick={() => remove.mutate(r.id)} className="inline-flex items-center gap-1 text-sm text-rose-600 hover:underline"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && meta && (
        <RuleBuilder meta={meta} rule={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); invalidate(); }} />
      )}
    </div>
  );
}

function RuleBuilder({ meta, rule, onClose, onSaved }: { meta: AutomationMeta; rule: AutomationRule | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(rule?.name ?? '');
  const [trigger, setTrigger] = useState(rule?.trigger ?? meta.triggers[0]?.key ?? '');
  const [conditions, setConditions] = useState<AutomationCondition[]>(rule?.definition.conditions ?? []);
  const [actions, setActions] = useState<AutomationAction[]>(rule?.definition.actions ?? [{ type: meta.actions[0]?.type ?? 'SEND_NOTIFICATION', params: {} }]);
  const [error, setError] = useState<string | null>(null);

  const triggerFields = meta.triggers.find((t) => t.key === trigger)?.fields ?? [];

  const save = useMutation({
    mutationFn: async () => {
      const body = { name, trigger, isActive: rule?.isActive ?? true, definition: { conditions, actions } };
      return rule ? (await api.patch(`/automation/${rule.id}`, body)).data : (await api.post('/automation', body)).data;
    },
    onSuccess: onSaved,
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const setAction = (i: number, next: AutomationAction) => setActions(actions.map((a, idx) => (idx === i ? next : a)));
  const setParam = (i: number, key: string, value: string) =>
    setAction(i, { ...actions[i], params: { ...actions[i].params, [key]: value } });

  return (
    <Drawer title={rule ? 'Edit Rule' : 'New Automation Rule'} onClose={onClose}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate(); }}>
        <div><label className="label">Rule name *</label><input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Notify manager on new hot lead" /></div>

        <div>
          <label className="label">When this happens (trigger) *</label>
          <select className="input" value={trigger} onChange={(e) => { setTrigger(e.target.value); setConditions([]); }}>
            {meta.triggers.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>

        {/* Conditions */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">Only if (conditions)</label>
            <button type="button" className="text-xs text-brand-600 hover:underline" disabled={triggerFields.length === 0}
              onClick={() => setConditions([...conditions, { field: triggerFields[0] ?? '', op: 'eq', value: '' }])}>+ Add condition</button>
          </div>
          {triggerFields.length === 0 && <p className="text-xs text-slate-400">This trigger has no filterable fields.</p>}
          <div className="space-y-2">
            {conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <select className="input py-1.5 text-sm" value={c.field} onChange={(e) => setConditions(conditions.map((x, idx) => idx === i ? { ...x, field: e.target.value } : x))}>
                  {triggerFields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <select className="input w-24 py-1.5 text-sm" value={c.op} onChange={(e) => setConditions(conditions.map((x, idx) => idx === i ? { ...x, op: e.target.value } : x))}>
                  {OPS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <input className="input py-1.5 text-sm" value={String(c.value)} onChange={(e) => setConditions(conditions.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} placeholder="value" />
                <button type="button" onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">Then do (actions) *</label>
            <button type="button" className="text-xs text-brand-600 hover:underline"
              onClick={() => setActions([...actions, { type: meta.actions[0].type, params: {} }])}>+ Add action</button>
          </div>
          <div className="space-y-3">
            {actions.map((a, i) => {
              const def = meta.actions.find((x) => x.type === a.type);
              return (
                <div key={i} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="mb-2 flex items-center gap-2">
                    <select className="input py-1.5 text-sm" value={a.type} onChange={(e) => setAction(i, { type: e.target.value, params: {} })}>
                      {meta.actions.map((x) => <option key={x.type} value={x.type}>{x.label}</option>)}
                    </select>
                    {actions.length > 1 && <button type="button" onClick={() => setActions(actions.filter((_, idx) => idx !== i))} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(def?.params ?? []).map((param) => (
                      <ParamInput key={param} param={param} value={a.params?.[param] ?? ''} targets={meta.recipientTargets} onChange={(v) => setParam(i, param, v)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
        <button className="btn-primary w-full" disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {rule ? 'Save changes' : 'Create rule'}</button>
      </form>
    </Drawer>
  );
}

function ParamInput({ param, value, targets, onChange }: { param: string; value: string; targets: string[]; onChange: (v: string) => void }) {
  const label = param.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  if (param === 'to' || param === 'assignTo') {
    return (
      <label className="text-xs text-slate-500">{label}
        <select className="input mt-1 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {targets.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
        </select>
      </label>
    );
  }
  if (param === 'priority') {
    return (
      <label className="text-xs text-slate-500">{label}
        <select className="input mt-1 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
    );
  }
  if (param === 'department') {
    return (
      <label className="text-xs text-slate-500">{label}
        <select className="input mt-1 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>{DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="text-xs text-slate-500">{label}
      <input className="input mt-1 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
