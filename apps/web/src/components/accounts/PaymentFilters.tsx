'use client';

import { Search, X } from 'lucide-react';
import { PAYMENT_STATUSES, PAYMENT_TYPES } from './paymentMeta';

export interface PaymentFilterState {
  search: string;
  status: string; // 'all' or a status value
  type: string; // 'all' or a type value
}

export const EMPTY_PAYMENT_FILTERS: PaymentFilterState = { search: '', status: 'all', type: 'all' };

interface PaymentFiltersProps {
  filters: PaymentFilterState;
  onChange: (next: PaymentFilterState) => void;
}

export function PaymentFilters({ filters, onChange }: PaymentFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search payer, payment ID or reference no.…"
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
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          className="input sm:w-auto"
          value={filters.type}
          onChange={(e) => onChange({ ...filters, type: e.target.value })}
          aria-label="Filter by type"
        >
          <option value="all">All Types</option>
          {PAYMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
