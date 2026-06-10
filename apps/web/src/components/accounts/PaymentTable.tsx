'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MoreVertical, Eye, ShieldCheck, CheckCircle2, XCircle, Trash2, ChevronLeft, ChevronRight, Wallet,
} from 'lucide-react';
import { cn, inr } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { methodLabel, typeLabel, statusLabel, statusTone } from './paymentMeta';
import type { Payment } from '@/lib/types';

export type PaymentAction = 'view' | 'verify' | 'confirm' | 'reject' | 'delete';

interface PaymentTableProps {
  payments: Payment[];
  loading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAction: (action: PaymentAction, payment: Payment) => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function fmtDate(p: Payment): string {
  const iso = p.paymentDate ?? p.createdAt;
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export function PaymentTable({
  payments,
  loading,
  canEdit,
  canDelete,
  onAction,
  page,
  totalPages,
  total,
  onPageChange,
}: PaymentTableProps) {
  if (loading) return <LoadingState />;
  if (payments.length === 0) return <EmptyState />;

  return (
    <>
      {/* TABLE — md and up */}
      <div className="card hidden overflow-hidden p-0 md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">Payment ID</th>
                <th className="px-4 py-3 font-medium">Payer</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Type</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onAction('view', p)}
                  className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{p.reference}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{p.payerName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{inr(Number(p.amount))}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{methodLabel(p.method)}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 lg:table-cell dark:text-slate-300">{typeLabel(p.type)}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-slate-500 lg:table-cell dark:text-slate-400">{fmtDate(p)}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge></td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActions payment={p} canEdit={canEdit} canDelete={canDelete} onAction={onAction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} count={payments.length} onPageChange={onPageChange} />
      </div>

      {/* CARDS — mobile */}
      <div className="space-y-3 md:hidden">
        {payments.map((p) => (
          <div key={p.id} className="card" onClick={() => onAction('view', p)}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{p.payerName}</p>
                <p className="font-mono text-xs text-slate-400">{p.reference}</p>
              </div>
              <Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {methodLabel(p.method)} · {typeLabel(p.type)} · {fmtDate(p)}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{inr(Number(p.amount))}</span>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
              <RowActions payment={p} canEdit={canEdit} canDelete={canDelete} onAction={onAction} inline />
            </div>
          </div>
        ))}
        <div className="card p-0">
          <Pagination page={page} totalPages={totalPages} total={total} count={payments.length} onPageChange={onPageChange} />
        </div>
      </div>
    </>
  );
}

function RowActions({
  payment,
  canEdit,
  canDelete,
  onAction,
  inline,
}: {
  payment: Payment;
  canEdit: boolean;
  canDelete: boolean;
  onAction: (action: PaymentAction, payment: Payment) => void;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const canVerify = canEdit && payment.status === 'PENDING';
  const canConfirm = canEdit && (payment.status === 'PENDING' || payment.status === 'VERIFIED');
  const canReject = canEdit && payment.status !== 'CONFIRMED' && payment.status !== 'REJECTED';

  function fire(a: PaymentAction) {
    setOpen(false);
    onAction(a, payment);
  }

  if (inline) {
    // Mobile: lay actions out as a row of buttons.
    return (
      <div className="flex flex-wrap gap-2">
        <InlineBtn icon={<Eye className="h-3.5 w-3.5" />} label="View" onClick={() => fire('view')} />
        {canVerify && <InlineBtn icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Verify" tone="blue" onClick={() => fire('verify')} />}
        {canConfirm && <InlineBtn icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Confirm" tone="green" onClick={() => fire('confirm')} />}
        {canReject && <InlineBtn icon={<XCircle className="h-3.5 w-3.5" />} label="Reject" tone="rose" onClick={() => fire('reject')} />}
        {canDelete && <InlineBtn icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" tone="rose" onClick={() => fire('delete')} />}
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <MenuItem icon={<Eye className="h-4 w-4" />} label="View details" onClick={() => fire('view')} />
          {canVerify && <MenuItem icon={<ShieldCheck className="h-4 w-4" />} label="Verify" onClick={() => fire('verify')} />}
          {canConfirm && <MenuItem icon={<CheckCircle2 className="h-4 w-4" />} label="Confirm" onClick={() => fire('confirm')} />}
          {canReject && <MenuItem icon={<XCircle className="h-4 w-4" />} label="Reject" onClick={() => fire('reject')} />}
          {canDelete && (
            <>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <MenuItem icon={<Trash2 className="h-4 w-4" />} label="Delete" danger onClick={() => fire('delete')} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition',
        danger
          ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function InlineBtn({
  icon,
  label,
  onClick,
  tone = 'slate',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'slate' | 'blue' | 'green' | 'rose';
}) {
  const tones = {
    slate: 'text-slate-600 dark:text-slate-300',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    rose: 'text-rose-600 dark:text-rose-400',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800', tones[tone])}
    >
      {icon}
      {label}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  count,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  count: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing <span className="font-medium text-slate-700 dark:text-slate-200">{count}</span> of{' '}
        <span className="font-medium text-slate-700 dark:text-slate-200">{total}</span> payments
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

function LoadingState() {
  return (
    <div className="card p-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="hidden h-4 w-20 animate-pulse rounded bg-slate-100 sm:block dark:bg-slate-800" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Wallet className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No payments found</h2>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Try adjusting your search or filters, or record a new payment to get started.
      </p>
    </div>
  );
}
