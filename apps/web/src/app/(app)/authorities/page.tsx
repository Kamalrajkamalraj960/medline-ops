'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { PageHeader } from '@/components/ui';
import { AuthorityStats } from '@/components/authority/AuthorityStats';
import { AuthorityFilters, EMPTY_AUTHORITY_FILTERS, type AuthorityFilterState } from '@/components/authority/AuthorityFilters';
import { AuthorityTable } from '@/components/authority/AuthorityTable';
import { AuthorityDetailDrawer } from '@/components/authority/AuthorityDetailDrawer';
import type { AuthorityRow, AuthorityStatsResponse } from '@/components/authority/authorityMeta';

interface AuthorityListResponse {
  items: AuthorityRow[];
  total: number;
}

export default function AuthorityTrackingPage() {
  const canEdit = useAuthStore((s) => s.hasPermission('authority:edit'));

  const [filters, setFilters] = useState<AuthorityFilterState>(EMPTY_AUTHORITY_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['authority-list', filters],
    queryFn: async () =>
      (
        await api.get<AuthorityListResponse>('/authority-tracking', {
          params: {
            search: filters.search || undefined,
            authority: filters.authority !== 'all' ? filters.authority : undefined,
            status: filters.status !== 'all' ? filters.status : undefined,
          },
        })
      ).data,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['authority-stats'],
    queryFn: async () => (await api.get<AuthorityStatsResponse>('/authority-tracking/stats')).data,
  });

  // Generate overdue notifications once on load (deduped server-side). Requires edit rights.
  useEffect(() => {
    if (canEdit) api.post('/authority-tracking/notify-overdue').catch(() => {});
  }, [canEdit]);

  const subtitle = useMemo(() => {
    if (!stats) return 'Track authority submissions and approvals';
    return `${stats.casesWithAuthorities} case${stats.casesWithAuthorities === 1 ? '' : 's'} with authorities • ${stats.overdueFollowUps} overdue follow-up${stats.overdueFollowUps === 1 ? '' : 's'}`;
  }, [stats]);

  const rows = data?.items ?? [];

  return (
    <div>
      <PageHeader title="Authority Tracking" subtitle={subtitle} />

      <AuthorityStats stats={stats} loading={statsLoading} />

      <AuthorityFilters filters={filters} onChange={setFilters} />

      <AuthorityTable rows={rows} loading={isLoading} onOpen={(r) => setOpenId(r.id)} />

      {openId && <AuthorityDetailDrawer id={openId} canEdit={canEdit} onClose={() => setOpenId(null)} />}
    </div>
  );
}
