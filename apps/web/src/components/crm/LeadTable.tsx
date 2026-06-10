'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadRow, LeadCard } from './LeadRow';
import type { Lead, SortableField, SortState, ViewMode } from './types';

interface Column {
  key: SortableField | 'select' | 'phone' | 'profession' | 'service';
  label: string;
  sortable?: boolean;
  /** Responsive visibility class for "compact on tablet". */
  className?: string;
}

const COLUMNS: Column[] = [
  { key: 'select', label: '' },
  { key: 'leadId', label: 'Lead ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'profession', label: 'Profession', className: 'hidden lg:table-cell' },
  { key: 'service', label: 'Service', className: 'hidden xl:table-cell' },
  { key: 'stage', label: 'Stage', sortable: true },
  { key: 'assignedTo', label: 'Assigned To', sortable: true, className: 'hidden lg:table-cell' },
  { key: 'createdAt', label: 'Added Date', sortable: true, className: 'hidden xl:table-cell' },
  { key: 'priority', label: 'Priority', sortable: true },
];

interface LeadTableProps {
  leads: Lead[]; // full filtered + sorted set
  view: ViewMode;
  loading: boolean;
  sort: SortState;
  onSortChange: (field: SortableField) => void;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAllOnPage: (ids: string[], select: boolean) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function LeadTable({
  leads,
  view,
  loading,
  sort,
  onSortChange,
  selectedIds,
  onToggle,
  onToggleAllOnPage,
  page,
  pageSize,
  onPageChange,
}: LeadTableProps) {
  const totalPages = Math.max(1, Math.ceil(leads.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = leads.slice(start, start + pageSize);
  const pageIds = pageItems.map((l) => l.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  if (loading) return <LoadingState view={view} />;
  if (leads.length === 0) return <EmptyState />;

  return (
    <div>
      {/* TABLE — desktop & tablet (hidden on mobile, and when card view is chosen) */}
      <div className={cn('card overflow-hidden p-0', view === 'card' ? 'hidden' : 'hidden md:block')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                {COLUMNS.map((col) => {
                  if (col.key === 'select') {
                    return (
                      <th key="select" className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={(e) => onToggleAllOnPage(pageIds, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
                          aria-label="Select all on page"
                        />
                      </th>
                    );
                  }
                  return (
                    <th key={col.key} className={cn('px-3 py-3 font-medium', col.className)}>
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => onSortChange(col.key as SortableField)}
                          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                        >
                          {col.label}
                          <SortIcon active={sort.field === col.key} direction={sort.direction} />
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((lead) => (
                <LeadRow key={lead.id} lead={lead} selected={selectedIds.has(lead.id)} onToggle={onToggle} />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={leads.length}
          start={start}
          count={pageItems.length}
          onPageChange={onPageChange}
        />
      </div>

      {/* CARDS — mobile always; all widths when card view is chosen */}
      <div className={cn(view === 'card' ? 'block' : 'md:hidden')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((lead) => (
            <LeadCard key={lead.id} lead={lead} selected={selectedIds.has(lead.id)} onToggle={onToggle} />
          ))}
        </div>
        <div className="card mt-3 p-0">
          <Pagination
            page={safePage}
            totalPages={totalPages}
            total={leads.length}
            start={start}
            count={pageItems.length}
            onPageChange={onPageChange}
          />
        </div>
      </div>
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />;
  return direction === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
  );
}

function Pagination({
  page,
  totalPages,
  total,
  start,
  count,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  count: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing <span className="font-medium text-slate-700 dark:text-slate-200">{count === 0 ? 0 : start + 1}</span>–
        <span className="font-medium text-slate-700 dark:text-slate-200">{start + count}</span> of{' '}
        <span className="font-medium text-slate-700 dark:text-slate-200">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:enabled:hover:bg-slate-800"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <span className="px-2 text-xs text-slate-500 dark:text-slate-400">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:enabled:hover:bg-slate-800"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function LoadingState({ view }: { view: ViewMode }) {
  if (view === 'card') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-800/40" />
        ))}
      </div>
    );
  }
  return (
    <div className="card p-0">
      <div className="space-y-px">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-slate-100 sm:block dark:bg-slate-800" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <SearchX className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No leads found</h2>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Try adjusting your search or filters, or add a new lead to get started.
      </p>
    </div>
  );
}
