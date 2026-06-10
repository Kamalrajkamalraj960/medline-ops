'use client';

import { Search, X } from 'lucide-react';

export type CourseStatusFilter = 'all' | 'active' | 'inactive' | 'archived';
export type CourseSort = 'newest' | 'oldest';

export interface CatalogFilters {
  search: string;
  category: string; // 'all' or a category name
  status: CourseStatusFilter;
  sort: CourseSort;
}

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  search: '',
  category: 'all',
  status: 'all',
  sort: 'newest',
};

interface CourseFiltersProps {
  filters: CatalogFilters;
  onChange: (next: CatalogFilters) => void;
  categories: string[];
}

export function CourseFilters({ filters, onChange, categories }: CourseFiltersProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Search */}
      <div className="relative w-full lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search courses by name or category…"
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

      {/* Filter / sort controls */}
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select
          className="input sm:w-auto"
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="input sm:w-auto"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as CourseStatusFilter })}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>

        <select
          className="input sm:w-auto"
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as CourseSort })}
          aria-label="Sort"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
    </div>
  );
}
