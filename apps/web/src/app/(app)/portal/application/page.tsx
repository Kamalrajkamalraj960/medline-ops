'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge, PageHeader, ProgressBar } from '@/components/ui';
import type { PortalOverview } from '@/lib/types';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0 dark:border-slate-800">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

export default function PortalApplicationPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-overview'],
    queryFn: async () => (await api.get<PortalOverview>('/portal/overview')).data,
  });

  if (isError) return <div className="card text-center text-sm text-slate-500">No application linked to your account yet.</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My Application" subtitle="Full details of your case" />
      {isLoading || !data ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="card">
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs text-slate-400">{data.application.reference}</span>
              <Badge tone="violet">{data.application.stage.replaceAll('_', ' ')}</Badge>
            </div>
            <ProgressBar value={data.application.progressPct} />
          </div>
          <Row label="Service Type" value={<span className="capitalize">{data.application.type}</span>} />
          {data.application.authority && <Row label="Authority" value={data.application.authority} />}
          {data.application.authorityStatus && <Row label="Authority Status" value={data.application.authorityStatus.replaceAll('_', ' ')} />}
          {data.application.authorityReference && <Row label="Reference Number" value={<span className="font-mono text-xs">{data.application.authorityReference}</span>} />}
          {data.application.course && <Row label="Course" value={data.application.course} />}
          {data.application.batch && <Row label="Batch" value={data.application.batch} />}
          <Row label="Documents Verified" value={`${data.documents.verified}/${data.documents.total}`} />
          <Row label="Progress" value={`${data.application.progressPct}%`} />
        </div>
      )}
    </div>
  );
}
