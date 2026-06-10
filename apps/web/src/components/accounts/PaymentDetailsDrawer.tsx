'use client';

import { useState } from 'react';
import {
  X, ShieldCheck, CheckCircle2, XCircle, Trash2, ExternalLink, Link2, Loader2, Clock,
} from 'lucide-react';
import { cn, inr } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { methodLabel, typeLabel, statusLabel, statusTone } from './paymentMeta';
import type { Payment } from '@/lib/types';
import type { PaymentAction } from './PaymentTable';

interface PaymentDetailsDrawerProps {
  payment: Payment;
  canEdit: boolean;
  canDelete: boolean;
  busy?: boolean;
  onAction: (action: PaymentAction, payment: Payment, reason?: string) => void;
  onClose: () => void;
}

function dt(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

export function PaymentDetailsDrawer({ payment, canEdit, canDelete, busy, onAction, onClose }: PaymentDetailsDrawerProps) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const linked =
    payment.lead?.reference ??
    payment.student?.reference ??
    payment.invoice?.number ??
    null;
  const linkedName = payment.lead?.name ?? payment.student?.name ?? payment.invoice?.clientName ?? null;

  const canVerify = canEdit && payment.status === 'PENDING';
  const canConfirm = canEdit && (payment.status === 'PENDING' || payment.status === 'VERIFIED');
  const canReject = canEdit && payment.status !== 'CONFIRMED' && payment.status !== 'REJECTED';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="font-mono text-xs text-slate-400">{payment.reference}</p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{inr(Number(payment.amount))}</h2>
            <div className="mt-1.5"><Badge tone={statusTone(payment.status)}>{statusLabel(payment.status)}</Badge></div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Core fields */}
          <section className="space-y-3">
            <Field label="Payer" value={payment.payerName} />
            <Field label="Payment type" value={typeLabel(payment.type)} />
            <Field label="Method" value={methodLabel(payment.method)} />
            <Field label="Transaction reference" value={payment.transactionRef || '—'} mono />
            <Field label="Installment" value={payment.installmentNumber ? `#${payment.installmentNumber}` : '—'} />
            <Field label="Payment date" value={dt(payment.paymentDate)} />
            {payment.notes && <Field label="Notes" value={payment.notes} />}
            {payment.rejectionReason && <Field label="Rejection reason" value={payment.rejectionReason} />}
          </section>

          {/* Linked record */}
          {linked && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Linked record</h3>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-800">
                <Link2 className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-xs text-slate-500">{linked}</span>
                {linkedName && <span className="text-slate-700 dark:text-slate-200">· {linkedName}</span>}
              </div>
            </section>
          )}

          {/* Receipt */}
          {payment.proofUrl && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Uploaded receipt</h3>
              <a
                href={payment.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-brand-400 dark:hover:bg-slate-800"
              >
                <ExternalLink className="h-4 w-4" /> View receipt
              </a>
            </section>
          )}

          {/* History / verification logs */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Payment history</h3>
            {payment.history && payment.history.length > 0 ? (
              <ol className="space-y-3">
                {[...payment.history].reverse().map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {h.action}
                        {h.status && h.status !== h.action && (
                          <span className="text-slate-400"> · {statusLabel(h.status)}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {dt(h.at)}
                        {h.byName ? ` · ${h.byName}` : ''}
                      </p>
                      {h.note && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">“{h.note}”</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-400">No history yet.</p>
            )}
          </section>
        </div>

        {/* Actions footer */}
        {(canVerify || canConfirm || canReject || canDelete) && (
          <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
            {rejecting ? (
              <div className="space-y-2">
                <textarea
                  className="input min-h-[64px] resize-y"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for rejection (optional)…"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRejecting(false)}
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onAction('reject', payment, reason.trim() || undefined)}
                    disabled={busy}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {canVerify && (
                  <ActionBtn icon={<ShieldCheck className="h-4 w-4" />} label="Verify" tone="blue" disabled={busy} onClick={() => onAction('verify', payment)} />
                )}
                {canConfirm && (
                  <ActionBtn icon={<CheckCircle2 className="h-4 w-4" />} label="Confirm" tone="green" disabled={busy} onClick={() => onAction('confirm', payment)} />
                )}
                {canReject && (
                  <ActionBtn icon={<XCircle className="h-4 w-4" />} label="Reject" tone="rose" disabled={busy} onClick={() => setRejecting(true)} />
                )}
                {canDelete && (
                  <ActionBtn icon={<Trash2 className="h-4 w-4" />} label="Delete" tone="ghost-rose" disabled={busy} onClick={() => onAction('delete', payment)} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn('text-right text-sm font-medium text-slate-900 dark:text-white', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  tone,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'blue' | 'green' | 'rose' | 'ghost-rose';
  disabled?: boolean;
  onClick: () => void;
}) {
  const tones = {
    blue: 'bg-blue-600 text-white hover:bg-blue-700',
    green: 'bg-emerald-600 text-white hover:bg-emerald-700',
    rose: 'bg-rose-600 text-white hover:bg-rose-700',
    'ghost-rose': 'border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn('inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60', tones[tone])}
    >
      {icon}
      {label}
    </button>
  );
}
