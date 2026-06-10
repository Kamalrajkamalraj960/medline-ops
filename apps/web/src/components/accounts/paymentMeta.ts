import type { Badge } from '@/components/ui';

type BadgeTone = React.ComponentProps<typeof Badge>['tone'];

/** Selectable payment methods (value → human label). */
export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'ONLINE_GATEWAY', label: 'Razorpay' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

export const PAYMENT_TYPES: { value: string; label: string }[] = [
  { value: 'CONSULTANCY', label: 'Consultancy' },
  { value: 'ACADEMY', label: 'Academy' },
  { value: 'CRM', label: 'CRM' },
  { value: 'OTHER', label: 'Other' },
];

/** The four workflow statuses surfaced in the UI. */
export const PAYMENT_STATUSES: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Pending Verification' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function methodLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value.replaceAll('_', ' ');
}

export function typeLabel(value: string): string {
  return PAYMENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pending Verification', tone: 'amber' },
  VERIFIED: { label: 'Verified', tone: 'blue' },
  CONFIRMED: { label: 'Confirmed', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'rose' },
  FAILED: { label: 'Failed', tone: 'rose' },
  REFUNDED: { label: 'Refunded', tone: 'slate' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
};

export function statusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status;
}

export function statusTone(status: string): BadgeTone {
  return STATUS_META[status]?.tone ?? 'slate';
}

/** Compact INR for headlines, e.g. 129000 → "₹129K", 1500000 → "₹15L". */
export function compactInr(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(value % 1e7 === 0 ? 0 : 1)}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(value % 1e5 === 0 ? 0 : 1)}L`;
  if (value >= 1e3) return `₹${Math.round(value / 1e3)}K`;
  return `₹${value}`;
}
