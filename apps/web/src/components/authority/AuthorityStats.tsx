'use client';

import { Landmark } from 'lucide-react';
import type { AuthorityStatsResponse } from './authorityMeta';

const ACCENTS: Record<string, string> = {
  DHA: 'bg-blue-50 text-blue-600 dark:bg-blue-600/15 dark:text-blue-300',
  'MOH UAE': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-600/15 dark:text-emerald-300',
  HAAD: 'bg-violet-50 text-violet-600 dark:bg-violet-600/15 dark:text-violet-300',
  SCFHS: 'bg-amber-50 text-amber-600 dark:bg-amber-600/15 dark:text-amber-300',
  Prometric: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-600/15 dark:text-cyan-300',
  Dataflow: 'bg-rose-50 text-rose-600 dark:bg-rose-600/15 dark:text-rose-300',
};

export function AuthorityStats({ stats, loading }: { stats?: AuthorityStatsResponse; loading?: boolean }) {
  const cards = stats?.cards ?? [];
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {(loading ? Array.from({ length: 6 }).map((_, i) => ({ authority: `#${i}`, activeCases: 0 })) : cards).map((c) => (
        <div key={c.authority} className="card flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ACCENTS[c.authority] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
            <Landmark className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            {loading ? (
              <div className="h-6 w-8 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ) : (
              <p className="text-xl font-bold leading-none text-slate-900 dark:text-white">{c.activeCases}</p>
            )}
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{loading ? '—' : c.authority}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
