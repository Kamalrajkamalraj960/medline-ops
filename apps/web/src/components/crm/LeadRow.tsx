'use client';

import { Phone, Briefcase, UserCircle2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StageBadge, PriorityBadge } from './badges';
import type { Lead } from './types';

/** Formats an ISO date as e.g. "09 Jun 2026". */
export function formatLeadDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-600/15 dark:text-brand-300">
      {initials}
    </span>
  );
}

interface LeadRowProps {
  lead: Lead;
  selected: boolean;
  onToggle: (id: string) => void;
}

/** Desktop / tablet table row. Some columns collapse on smaller widths. */
export function LeadRow({ lead, selected, onToggle }: LeadRowProps) {
  return (
    <tr
      className={cn(
        'border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40',
        selected && 'bg-brand-50/60 dark:bg-brand-600/10',
      )}
    >
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(lead.id)}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
          aria-label={`Select ${lead.name}`}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{lead.leadId}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={lead.name} />
          <span className="font-medium text-slate-900 dark:text-white">{lead.name}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">{lead.phone}</td>
      <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 lg:table-cell dark:text-slate-300">
        {lead.profession}
      </td>
      <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 xl:table-cell dark:text-slate-300">
        {lead.service}
      </td>
      <td className="px-3 py-3">
        <StageBadge stage={lead.stage} />
      </td>
      <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 lg:table-cell dark:text-slate-300">
        {lead.assignedTo}
      </td>
      <td className="hidden whitespace-nowrap px-3 py-3 text-slate-500 xl:table-cell dark:text-slate-400">
        {formatLeadDate(lead.createdAt)}
      </td>
      <td className="px-3 py-3">
        <PriorityBadge priority={lead.priority} />
      </td>
    </tr>
  );
}

/** Card representation used for the card view and the mobile layout. */
export function LeadCard({ lead, selected, onToggle }: LeadRowProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-slate-900',
        selected ? 'border-brand-400 ring-1 ring-brand-400/40' : 'border-slate-200 dark:border-slate-800',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={lead.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{lead.name}</p>
            <p className="font-mono text-xs text-slate-400">{lead.leadId}</p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(lead.id)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
          aria-label={`Select ${lead.name}`}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StageBadge stage={lead.stage} />
        <PriorityBadge priority={lead.priority} />
      </div>

      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <Detail icon={<Phone className="h-3.5 w-3.5" />} value={lead.phone} />
        <Detail icon={<Briefcase className="h-3.5 w-3.5" />} value={lead.profession} />
        <Detail icon={<UserCircle2 className="h-3.5 w-3.5" />} value={lead.assignedTo} />
        <Detail icon={<CalendarDays className="h-3.5 w-3.5" />} value={formatLeadDate(lead.createdAt)} />
        <Detail icon={<Briefcase className="h-3.5 w-3.5" />} value={lead.service} full />
      </dl>
    </div>
  );
}

function Detail({ icon, value, full }: { icon: React.ReactNode; value: string; full?: boolean }) {
  return (
    <dd className={cn('flex items-center gap-1.5 text-slate-600 dark:text-slate-300', full && 'col-span-2')}>
      <span className="text-slate-400">{icon}</span>
      <span className="truncate">{value}</span>
    </dd>
  );
}
