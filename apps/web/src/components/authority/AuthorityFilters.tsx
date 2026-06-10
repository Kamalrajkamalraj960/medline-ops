'use client';

import { Search, X } from 'lucide-react';
import { STATUS_OPTIONS } from './authorityMeta';

export interface AuthorityFilterState {
  search: string;
  authority: string; // 'all' or authority name
  status: string; // 'all' or status value
}

export const EMPTY_AUTHORITY_FILTERS: AuthorityFilterState = { search: '', authority: 'all', status: 'all' };

const FILTER_AUTHORITIES = ['DHA', 'MOH UAE', 'HAAD', 'SCFHS', 'Prometric', 'Dataflow'];

export function AuthorityFilters({
  filters,
  onChange,
}: {
  filters: AuthorityFilterState;
  onChange: (next: AuthorityFilterState) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search client, case ID or reference no.…"
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

      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <select
          className="input sm:w-auto"
          value={filters.authority}
          onChange={(e) => onChange({ ...filters, authority: e.target.value })}
          aria-label="Filter by authority"
        >
          <option value="all">All Authorities</option>
          {FILTER_AUTHORITIES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          className="input sm:w-auto"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
