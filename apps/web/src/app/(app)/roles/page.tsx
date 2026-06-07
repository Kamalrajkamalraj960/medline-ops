'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Badge, PageHeader } from '@/components/ui';
import type { RoleWithPermissions } from '@/lib/types';

export default function RolesPage() {
  const { data: roles, isLoading } = useQuery({ queryKey: ['admin-roles'], queryFn: async () => (await api.get<RoleWithPermissions[]>('/admin/roles')).data });
  const { data: matrix } = useQuery({ queryKey: ['admin-permissions'], queryFn: async () => (await api.get<{ resources: string[]; actions: string[] }>('/admin/permissions')).data });
  const [selected, setSelected] = useState<string | null>(null);

  const role = roles?.find((r) => r.id === selected) ?? roles?.[0];
  const permSet = new Set(role?.permissions ?? []);
  const isAdmin = role?.name === 'SUPER_ADMIN';

  return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Access matrix for every role" />
      {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Role list */}
          <div className="space-y-2 lg:col-span-1">
            {roles?.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition',
                  (role?.id === r.id)
                    ? 'border-brand-400 bg-brand-50 dark:bg-brand-600/15'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50',
                )}
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{r.label}</p>
                    <p className="text-xs text-slate-400">{r.userCount} user(s)</p>
                  </div>
                </div>
                <Badge tone="slate">{r.name === 'SUPER_ADMIN' ? 'all' : r.permissions.length}</Badge>
              </button>
            ))}
          </div>

          {/* Matrix */}
          <div className="card lg:col-span-3">
            {role && (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{role.label}</h2>
                  {role.description && <p className="text-sm text-slate-500">{role.description}</p>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2 pr-3 text-left text-xs uppercase tracking-wide text-slate-400">Resource</th>
                        {matrix?.actions.map((a) => (
                          <th key={a} className="px-1 py-2 text-center text-[10px] font-medium uppercase text-slate-400">{a}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix?.resources.map((resource) => (
                        <tr key={resource} className="border-b border-slate-50 dark:border-slate-800/60">
                          <td className="py-2 pr-3 font-medium capitalize text-slate-700 dark:text-slate-200">{resource.replaceAll('_', ' ')}</td>
                          {matrix.actions.map((action) => {
                            const has = isAdmin || permSet.has(`${resource}:${action}`);
                            return (
                              <td key={action} className="px-1 py-2 text-center">
                                {has ? <Check className="mx-auto h-4 w-4 text-emerald-500" /> : <span className="text-slate-200 dark:text-slate-700">·</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isAdmin && <p className="mt-3 text-xs text-amber-600">Super Admin bypasses all permission checks.</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
