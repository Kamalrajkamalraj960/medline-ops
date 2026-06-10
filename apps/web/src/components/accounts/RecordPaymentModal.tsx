'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Drawer } from '@/components/drawer';
import { PAYMENT_METHODS, PAYMENT_TYPES } from './paymentMeta';

export interface RecordPaymentValues {
  payerName: string;
  type: string;
  amount: number;
  method: string;
  transactionRef?: string;
  paymentDate?: string;
  installmentNumber?: number;
  notes?: string;
  proofUrl?: string;
  status: string;
}

interface RecordPaymentModalProps {
  saving?: boolean;
  error?: string | null;
  onSubmit: (values: RecordPaymentValues) => void;
  onClose: () => void;
}

// Only the initial statuses make sense when recording a payment.
const INITIAL_STATUSES = [
  { value: 'PENDING', label: 'Pending Verification' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'CONFIRMED', label: 'Confirmed' },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentModal({ saving, error, onSubmit, onClose }: RecordPaymentModalProps) {
  const [form, setForm] = useState({
    payerName: '',
    type: 'CONSULTANCY',
    amount: '',
    method: 'UPI',
    transactionRef: '',
    paymentDate: today(),
    installmentNumber: '',
    notes: '',
    proofUrl: '',
    status: 'PENDING',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (form.payerName.trim().length < 2) {
      setLocalError('Payer name is required.');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setLocalError('Enter a valid amount.');
      return;
    }
    onSubmit({
      payerName: form.payerName.trim(),
      type: form.type,
      amount: Number(form.amount),
      method: form.method,
      transactionRef: form.transactionRef.trim() || undefined,
      paymentDate: form.paymentDate || undefined,
      installmentNumber: form.installmentNumber ? Number(form.installmentNumber) : undefined,
      notes: form.notes.trim() || undefined,
      proofUrl: form.proofUrl.trim() || undefined,
      status: form.status,
    });
  }

  return (
    <Drawer title="Record Payment" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="label">Payer name *</label>
          <input
            className="input"
            value={form.payerName}
            onChange={(e) => setForm({ ...form, payerName: e.target.value })}
            placeholder="e.g. Deepa Thomas"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Payment type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {PAYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount (₹) *</label>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Method</label>
            <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Transaction ID</label>
            <input
              className="input"
              value={form.transactionRef}
              onChange={(e) => setForm({ ...form, transactionRef: e.target.value })}
              placeholder="UTR / txn ref"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Payment date</label>
            <input
              className="input"
              type="date"
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Installment #</label>
            <input
              className="input"
              type="number"
              min={1}
              value={form.installmentNumber}
              onChange={(e) => setForm({ ...form, installmentNumber: e.target.value })}
              placeholder="1"
            />
          </div>
        </div>

        <div>
          <label className="label">Receipt URL</label>
          <input
            className="input"
            value={form.proofUrl}
            onChange={(e) => setForm({ ...form, proofUrl: e.target.value })}
            placeholder="https://…/receipt.pdf"
          />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[72px] resize-y"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any context for the accounts team…"
          />
        </div>

        <div>
          <label className="label">Status</label>
          <div className="grid grid-cols-3 gap-2">
            {INITIAL_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm({ ...form, status: s.value })}
                className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition ${
                  form.status === s.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                    : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {(localError || error) && (
          <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {localError || error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Record Payment
        </button>
      </form>
    </Drawer>
  );
}
