'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from '@/lib/toast-store';
import { PageHeader } from '@/components/ui';
import { LeadStats, type LeadStatValues } from '@/components/crm/LeadStats';
import { LeadFilters } from '@/components/crm/LeadFilters';
import { LeadTable } from '@/components/crm/LeadTable';
import { LeadWizard } from '@/components/crm/LeadWizard';
import {
  EMPTY_FILTERS, LEAD_PRIORITIES, STATUS_TO_STAGE, PRIORITY_TO_LABEL,
} from '@/components/crm/types';
import type { Lead as CrmLead, LeadFilterState, SortState, SortableField, ViewMode } from '@/components/crm/types';
import type { Lead as ApiLead } from '@/lib/types';

const PAGE_SIZE = 8;

interface ApiLeadList {
  items: ApiLead[];
  total: number;
}

interface LeadStatsResponse {
  total: number;
  byStatus: { status: string; _count: number }[];
}

const PRIORITY_RANK: Record<string, number> = Object.fromEntries(LEAD_PRIORITIES.map((p, i) => [p, i]));

/** Maps a backend lead onto the CRM table's display shape. */
function mapLead(l: ApiLead): CrmLead {
  return {
    id: l.id,
    leadId: l.reference,
    name: l.name,
    phone: l.phone,
    profession: l.profession || '—',
    service: l.serviceType === 'academy' ? 'Academy' : 'Consultancy',
    stage: STATUS_TO_STAGE[l.status] ?? 'New',
    assignedTo: l.owner?.name ?? 'Unassigned',
    createdAt: l.createdAt,
    priority: PRIORITY_TO_LABEL[l.priority] ?? 'Medium',
  };
}

export default function CrmLeadsPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('lead:create'));
  const canDelete = useAuthStore((s) => s.hasPermission('lead:delete'));

  const [filters, setFilters] = useState<LeadFilterState>(EMPTY_FILTERS);
  const [view, setView] = useState<ViewMode>('table');
  const [sort, setSort] = useState<SortState>({ field: 'createdAt', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['leads', 'crm'],
    queryFn: async () => (await api.get<ApiLeadList>('/leads', { params: { pageSize: 100 } })).data,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['leads', 'stats'],
    queryFn: async () => (await api.get<LeadStatsResponse>('/leads/stats')).data,
  });

  const leads = useMemo(() => (data?.items ?? []).map(mapLead), [data]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['leads'] });
    qc.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  }

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/leads/${id}`)));
    },
    onSuccess: (_d, ids) => {
      toast.success(`${ids.length} lead${ids.length === 1 ? '' : 's'} deleted`);
      setSelectedIds(new Set());
      invalidate();
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Failed to delete leads')),
  });

  function changeSort(field: SortableField) {
    setSort((prev) =>
      prev.field === field ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { field, direction: 'asc' },
    );
  }
  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAllOnPage(ids: string[], select: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  // Filter → sort pipeline (client-side over the loaded set).
  const visible = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const filtered = leads.filter((l) => {
      if (q && !`${l.name} ${l.phone} ${l.leadId}`.toLowerCase().includes(q)) return false;
      if (filters.stage !== 'all' && l.stage !== filters.stage) return false;
      if (filters.priority !== 'all' && l.priority !== filters.priority) return false;
      if (filters.service !== 'all' && l.service !== filters.service) return false;
      return true;
    });
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sort.field) {
        case 'priority':
          cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
          break;
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          cmp = String(a[sort.field]).localeCompare(String(b[sort.field]));
      }
      return cmp * dir;
    });
  }, [leads, filters, sort]);

  // Stat cards from the (global) stats endpoint.
  const statValues: LeadStatValues = useMemo(() => {
    const total = statsData?.total ?? 0;
    const by = statsData?.byStatus ?? [];
    const count = (s: string) => by.find((b) => b.status === s)?._count ?? 0;
    const converted = count('CONVERTED');
    const lost = count('LOST');
    const inPipeline = count('CONTACTED') + count('INTERESTED') + count('DEMO_SCHEDULED') + count('DEMO_COMPLETED') + count('DOCUMENTATION');
    return { total, active: Math.max(0, total - converted - lost), inPipeline, converted };
  }, [statsData]);

  const selectedCount = selectedIds.size;

  return (
    <div>
      <PageHeader
        title="CRM — Leads"
        subtitle={isLoading ? 'Loading leads…' : `${statValues.total} leads in the pipeline`}
        action={
          canCreate && (
            <button className="btn-primary" onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Lead</span>
              <span className="sm:hidden">Add</span>
            </button>
          )
        }
      />

      <LeadStats stats={statValues} loading={statsLoading} />

      <LeadFilters
        filters={filters}
        onChange={setFilters}
        view={view}
        onViewChange={setView}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['leads'] })}
        refreshing={isFetching}
      />

      {selectedCount > 0 && canDelete && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-600/30 dark:bg-brand-600/10">
          <span className="font-medium text-brand-700 dark:text-brand-300">
            {selectedCount} {selectedCount === 1 ? 'lead' : 'leads'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear
            </button>
            <button
              onClick={() => deleteMutation.mutate([...selectedIds])}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
            </button>
          </div>
        </div>
      )}

      <LeadTable
        leads={visible}
        view={view}
        loading={isLoading}
        sort={sort}
        onSortChange={changeSort}
        selectedIds={selectedIds}
        onToggle={toggleOne}
        onToggleAllOnPage={toggleAllOnPage}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {wizardOpen && (
        <LeadWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            setWizardOpen(false);
            invalidate();
          }}
        />
      )}
    </div>
  );
}
