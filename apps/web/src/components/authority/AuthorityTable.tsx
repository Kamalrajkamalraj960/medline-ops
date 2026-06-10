'use client';

import { ArrowRight, Landmark } from 'lucide-react';
import {
  AuthorityStatusBadge, FollowUpBadge, daysPendingClass, fmtDate, type AuthorityRow,
} from './authorityMeta';

interface AuthorityTableProps {
  rows: AuthorityRow[];
  loading: boolean;
  onOpen: (row: AuthorityRow) => void;
}

const TERMINAL = ['APPROVED', 'REJECTED', 'CLOSED'];

export function AuthorityTable({ rows, loading, onOpen }: AuthorityTableProps) {
  if (loading) return <LoadingState />;
  if (rows.length === 0) return <EmptyState />;

  return (
    <>
      {/* TABLE — md and up */}
      <div className="card hidden overflow-hidden p-0 md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Authority</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Reference</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Submitted</th>
                <th className="px-4 py-3 font-medium">Days Pending</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Follow-Up</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onOpen(r)}
                  className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{r.clientName}</p>
                    <p className="font-mono text-xs text-slate-400">{r.caseReference ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{r.authority}</p>
                    <p className="text-xs text-slate-400">{r.profession ?? '—'}</p>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500 lg:table-cell dark:text-slate-400">
                    {r.referenceNumber ?? '—'}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-500 lg:table-cell dark:text-slate-400">{fmtDate(r.submissionDate)}</td>
                  <td className={`whitespace-nowrap px-4 py-3 ${daysPendingClass(r.daysPending, TERMINAL.includes(r.status))}`}>
                    {TERMINAL.includes(r.status) ? '—' : `${r.daysPending}d`}
                  </td>
                  <td className="px-4 py-3"><AuthorityStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3"><FollowUpBadge status={r.followUpStatus} /></td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARDS — mobile */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="card" onClick={() => onOpen(r)}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{r.clientName}</p>
                <p className="font-mono text-xs text-slate-400">{r.caseReference ?? '—'}</p>
              </div>
              <AuthorityStatusBadge status={r.status} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                {r.authority} · {r.profession ?? '—'}
              </span>
              <span className={daysPendingClass(r.daysPending, TERMINAL.includes(r.status))}>
                {TERMINAL.includes(r.status) ? '—' : `${r.daysPending}d`}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
              <FollowUpBadge status={r.followUpStatus} />
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function LoadingState() {
  return (
    <div className="card p-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="hidden h-4 w-20 animate-pulse rounded bg-slate-100 sm:block dark:bg-slate-800" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Landmark className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No authority submissions found</h2>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Authority tracking is created automatically with each consultancy case. Adjust your filters or start a new case.
      </p>
    </div>
  );
}
