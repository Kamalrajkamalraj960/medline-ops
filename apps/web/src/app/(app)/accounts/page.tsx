'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { PageHeader } from '@/components/ui';
import { ConfirmDialog } from '@/components/academy/ConfirmDialog';
import { PaymentStats } from '@/components/accounts/PaymentStats';
import { PaymentFilters, EMPTY_PAYMENT_FILTERS, type PaymentFilterState } from '@/components/accounts/PaymentFilters';
import { PaymentTable, type PaymentAction } from '@/components/accounts/PaymentTable';
import { RecordPaymentModal, type RecordPaymentValues } from '@/components/accounts/RecordPaymentModal';
import { PaymentDetailsDrawer } from '@/components/accounts/PaymentDetailsDrawer';
import { compactInr } from '@/components/accounts/paymentMeta';
import type { Payment, PaymentStats as Stats } from '@/lib/types';

interface PaymentList {
  items: Payment[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AccountsPaymentsPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('payment:create'));
  const canEdit = useAuthStore((s) => s.hasPermission('payment:edit'));
  const canDelete = useAuthStore((s) => s.hasPermission('payment:delete'));

  const [filters, setFilters] = useState<PaymentFilterState>(EMPTY_PAYMENT_FILTERS);
  const [page, setPage] = useState(1);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', filters, page],
    queryFn: async () =>
      (
        await api.get<PaymentList>('/accounts/payments', {
          params: {
            search: filters.search || undefined,
            status: filters.status !== 'all' ? filters.status : undefined,
            type: filters.type !== 'all' ? filters.type : undefined,
            page,
            pageSize: 20,
          },
        })
      ).data,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: async () => (await api.get<Stats>('/accounts/payments/stats')).data,
  });

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['payments'] });
    qc.invalidateQueries({ queryKey: ['payment-stats'] });
    qc.invalidateQueries({ queryKey: ['invoices'] });
  }

  const recordMutation = useMutation({
    mutationFn: async (values: RecordPaymentValues) => (await api.post('/accounts/payments', values)).data,
    onSuccess: () => {
      setRecordOpen(false);
      invalidateAll();
    },
    onError: (e) => setRecordError(apiErrorMessage(e, 'Failed to record payment')),
  });

  const workflowMutation = useMutation({
    mutationFn: async ({ action, payment, reason }: { action: 'verify' | 'confirm' | 'reject'; payment: Payment; reason?: string }) =>
      (await api.post(`/accounts/payments/${payment.id}/${action}`, action === 'reject' ? { reason } : {})).data,
    onSuccess: invalidateAll,
    onError: (e) => window.alert(apiErrorMessage(e, 'Action failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (payment: Payment) => (await api.delete(`/accounts/payments/${payment.id}`)).data,
    onSuccess: (_data, payment) => {
      setDeleteTarget(null);
      if (selectedId === payment.id) setSelectedId(null);
      invalidateAll();
    },
    onError: (e) => {
      setDeleteTarget(null);
      window.alert(apiErrorMessage(e, 'Failed to delete payment'));
    },
  });

  function handleAction(action: PaymentAction, payment: Payment, reason?: string) {
    switch (action) {
      case 'view':
        setSelectedId(payment.id);
        break;
      case 'verify':
      case 'confirm':
        workflowMutation.mutate({ action, payment });
        break;
      case 'reject':
        workflowMutation.mutate({ action, payment, reason });
        break;
      case 'delete':
        setDeleteTarget(payment);
        break;
    }
  }

  const items = data?.items ?? [];
  const selected = items.find((p) => p.id === selectedId) ?? null;

  const subtitle = stats
    ? `${stats.pendingVerificationCount} pending verification · ${compactInr(stats.confirmedAmount)} confirmed`
    : 'Payment tracking & verification';

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={subtitle}
        action={
          canCreate && (
            <button
              className="btn-primary"
              onClick={() => {
                setRecordError(null);
                setRecordOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Record Payment
            </button>
          )
        }
      />

      <PaymentStats stats={stats} loading={statsLoading} />

      <PaymentFilters filters={filters} onChange={setFilters} />

      <PaymentTable
        payments={items}
        loading={isLoading}
        canEdit={canEdit}
        canDelete={canDelete}
        onAction={handleAction}
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />

      {recordOpen && (
        <RecordPaymentModal
          saving={recordMutation.isPending}
          error={recordError}
          onSubmit={(values) => {
            setRecordError(null);
            recordMutation.mutate(values);
          }}
          onClose={() => setRecordOpen(false)}
        />
      )}

      {selected && (
        <PaymentDetailsDrawer
          payment={selected}
          canEdit={canEdit}
          canDelete={canDelete}
          busy={workflowMutation.isPending || deleteMutation.isPending}
          onAction={handleAction}
          onClose={() => setSelectedId(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete payment?"
          message={`Payment ${deleteTarget.reference} (${deleteTarget.payerName}) will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete"
          tone="danger"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
