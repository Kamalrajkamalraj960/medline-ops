'use client';

import { use } from 'react';
import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/ui';

/**
 * Fallback for modules whose UI is on the roadmap but not yet built.
 * Keeps the full information architecture navigable from the sidebar so the
 * platform shape is visible end-to-end while individual modules land.
 */
export default function ModulePlaceholder({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params);
  const name = (slug?.[0] ?? 'module').replaceAll('-', ' ');

  return (
    <div>
      <PageHeader title={titleCase(name)} subtitle="Module" />
      <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-600/15 dark:text-amber-300">
          <Construction className="h-7 w-7" />
        </span>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">“{titleCase(name)}” is on the roadmap</h2>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
          The data model, API and RBAC are already wired for this module. The screen is the next vertical slice to
          build out — following the same pattern as the Leads / CRM module.
        </p>
      </div>
    </div>
  );
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
