'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, Cell, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, Download, Loader2, PieChart as PieIcon, Play, Table2 } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui';
import type { ReportResult, ReportSourceMeta } from '@/lib/types';

const COLORS = ['#327bff', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#64748b'];

export default function ReportsPage() {
  const { data: sources } = useQuery({ queryKey: ['report-meta'], queryFn: async () => (await api.get<ReportSourceMeta[]>('/reports/meta')).data });

  const [source, setSource] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [metric, setMetric] = useState<'count' | 'sum'>('count');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [viz, setViz] = useState<'table' | 'bar' | 'pie'>('bar');
  const [error, setError] = useState<string | null>(null);

  const selected = sources?.find((s) => s.key === source);

  const run = useMutation({
    mutationFn: async () => (await api.post<ReportResult>('/reports/run', {
      source, groupBy, metric, from: from || undefined, to: to || undefined,
    })).data,
    onError: (e) => setError(apiErrorMessage(e)),
  });
  const result = run.data;

  // When a source is chosen, default the dimension + reset metric if unsupported.
  const onSource = (key: string) => {
    setSource(key);
    const s = sources?.find((x) => x.key === key);
    setGroupBy(s?.dimensions[0]?.field ?? '');
    if (!s?.hasSum) setMetric('count');
    run.reset();
  };

  const csv = useMemo(() => {
    if (!result) return '';
    const header = `${result.dimension},${result.metricLabel}\n`;
    return header + result.rows.map((r) => `"${r.label}",${r.value}`).join('\n');
  }, [result]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${source}-by-${groupBy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Report Builder" subtitle="Build, visualize and export reports across the platform" />

      <div className="card mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label">Data source</label>
            <select className="input" value={source} onChange={(e) => onSource(e.target.value)}>
              <option value="">Select…</option>
              {sources?.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Group by</label>
            <select className="input" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} disabled={!selected}>
              {selected?.dimensions.map((d) => <option key={d.field} value={d.field}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Metric</label>
            <select className="input" value={metric} onChange={(e) => setMetric(e.target.value as 'count' | 'sum')}>
              <option value="count">Count</option>
              {selected?.hasSum && <option value="sum">Sum of {selected.sumLabel}</option>}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className="btn-primary" disabled={!source || !groupBy || run.isPending} onClick={() => { setError(null); run.mutate(); }}>
            {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run report
          </button>
          {error && <span className="text-sm text-rose-600">{error}</span>}
        </div>
      </div>

      {result && (
        <div className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{result.source} by {result.dimension}</h2>
              <p className="text-sm text-slate-500">{result.metricLabel} · total {result.total.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                {([['bar', BarChart3], ['pie', PieIcon], ['table', Table2]] as const).map(([v, Icon]) => (
                  <button key={v} onClick={() => setViz(v)} className={cn('rounded-md p-1.5', viz === v ? 'bg-brand-600 text-white' : 'text-slate-500')} title={v}>
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <button onClick={downloadCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"><Download className="h-4 w-4" /> CSV</button>
            </div>
          </div>

          {result.rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No data for this selection.</p>
          ) : viz === 'table' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">{result.dimension}</th>
                  <th className="pb-2 text-right font-medium">{result.metricLabel}</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.label} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-2.5 capitalize text-slate-700 dark:text-slate-200">{r.label.replaceAll('_', ' ')}</td>
                    <td className="py-2.5 text-right font-medium text-slate-900 dark:text-white">{r.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {viz === 'bar' ? (
                  <BarChart data={result.rows} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {result.rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie data={result.rows} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={110} label>
                      {result.rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
