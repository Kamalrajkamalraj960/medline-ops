'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, RefreshCw, LayoutGrid, Table2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LEAD_PRIORITIES, LEAD_SERVICES, LEAD_STAGES } from './types';
import type { LeadFilterState, ViewMode } from './types';

interface LeadFiltersProps {
  filters: LeadFilterState;
  onChange: (next: LeadFilterState) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

export function LeadFilters({ filters, onChange, view, onViewChange, onRefresh, refreshing }: LeadFiltersProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close the filters popover on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const activeCount = [filters.stage, filters.priority, filters.service].filter((v) => v !== 'all').length;

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search by name, mobile or lead ID…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Filters dropdown */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition',
              open || activeCount > 0
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Filter leads</p>
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, stage: 'all', priority: 'all', service: 'all' })}
                    className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label">Stage</label>
                  <select
                    className="input"
                    value={filters.stage}
                    onChange={(e) => onChange({ ...filters, stage: e.target.value as LeadFilterState['stage'] })}
                  >
                    <option value="all">All stages</option>
                    {LEAD_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Priority</label>
                  <select
                    className="input"
                    value={filters.priority}
                    onChange={(e) => onChange({ ...filters, priority: e.target.value as LeadFilterState['priority'] })}
                  >
                    <option value="all">All priorities</option>
                    {LEAD_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Service</label>
                  <select
                    className="input"
                    value={filters.service}
                    onChange={(e) => onChange({ ...filters, service: e.target.value as LeadFilterState['service'] })}
                  >
                    <option value="all">All services</option>
                    {LEAD_SERVICES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          <span className="hidden md:inline">Refresh</span>
        </button>

        {/* View switcher */}
        <div className="inline-flex rounded-xl border border-slate-300 p-0.5 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onViewChange('table')}
            className={cn(
              'inline-flex items-center justify-center rounded-lg p-2 transition',
              view === 'table'
                ? 'bg-brand-600 text-white'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
            aria-label="Table view"
            aria-pressed={view === 'table'}
          >
            <Table2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange('card')}
            className={cn(
              'inline-flex items-center justify-center rounded-lg p-2 transition',
              view === 'card'
                ? 'bg-brand-600 text-white'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
            aria-label="Card view"
            aria-pressed={view === 'card'}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
