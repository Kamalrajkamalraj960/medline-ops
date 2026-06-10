import { prisma, Prisma, type InvoiceStatus } from '@medline/db';
import { HttpError } from '../../lib/http-error.js';
import type {
  CreateInvoiceInput, CreateRefundInput, ListInput, ListPaymentsInput, RecordPaymentInput,
  RefundDecisionInput, UpdateInvoiceInput, UpdatePaymentInput,
} from './accounts.schema.js';

/** Who performed a payment action — recorded in the payment history. */
export interface Actor {
  id?: string;
  name?: string;
}

/** Relations + fields hydrated whenever we return a payment to the client. */
const paymentInclude = {
  invoice: { select: { number: true, clientName: true } },
  lead: { select: { name: true, reference: true } },
  student: { select: { name: true, reference: true } },
  course: { select: { name: true } },
} as const;

const dec = (n: number) => new Prisma.Decimal(n);
const num = (d: Prisma.Decimal | null | undefined) => (d ? Number(d) : 0);

interface HistoryEntry {
  action: string;
  status?: string;
  at: Date;
  byId?: string;
  byName?: string;
  note?: string;
}
/** Returns a new history array with the entry appended (capped to last 50).
 *  Typed as Prisma's JSON input so it can be assigned to the `history` column. */
function appendHistory(existing: unknown, entry: HistoryEntry): Prisma.InputJsonValue {
  const arr = Array.isArray(existing) ? (existing as HistoryEntry[]) : [];
  return [...arr, entry].slice(-50) as unknown as Prisma.InputJsonValue;
}

async function nextNumber(kind: 'invoice' | 'payment'): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = kind === 'invoice' ? `INV-${year}-` : `PAY-${year}-`;
  if (kind === 'invoice') {
    const last = await prisma.invoice.findFirst({
      where: { number: { startsWith: prefix } }, orderBy: { number: 'desc' }, select: { number: true },
    });
    const n = last ? Number(last.number.slice(prefix.length)) : 0;
    return `${prefix}${String(n + 1).padStart(4, '0')}`;
  }
  const last = await prisma.payment.findFirst({
    where: { reference: { startsWith: prefix } }, orderBy: { reference: 'desc' }, select: { reference: true },
  });
  const n = last ? Number(last.reference.slice(prefix.length)) : 0;
  return `${prefix}${String(n + 1).padStart(4, '0')}`;
}

/** Recomputes an invoice's status from its confirmed payments. */
async function reconcileInvoice(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === 'CANCELLED' || invoice.status === 'DRAFT') return;

  const agg = await prisma.payment.aggregate({
    where: { invoiceId, status: 'CONFIRMED' },
    _sum: { amount: true },
  });
  const paid = num(agg._sum.amount);
  const total = num(invoice.amount) + num(invoice.gstAmount);

  let status: InvoiceStatus = invoice.status;
  if (paid <= 0) status = invoice.dueAt && invoice.dueAt < new Date() ? 'OVERDUE' : 'ISSUED';
  else if (paid >= total) status = 'PAID';
  else status = 'PARTIALLY_PAID';

  if (status !== invoice.status) await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
}

export const accountsService = {
  // ---- Invoices ----
  async listInvoices(query: ListInput) {
    const where: Prisma.InvoiceWhereInput = {};
    if (query.status) where.status = query.status as InvoiceStatus;
    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: 'insensitive' } },
        { clientName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { _count: { select: { payments: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) };
  },

  async getInvoice(id: string) {
    const inv = await prisma.invoice.findUnique({ where: { id }, include: { payments: { orderBy: { createdAt: 'desc' } } } });
    if (!inv) throw HttpError.notFound('Invoice not found');
    return inv;
  },

  async createInvoice(input: CreateInvoiceInput) {
    const number = await nextNumber('invoice');
    return prisma.invoice.create({
      data: {
        number,
        clientName: input.clientName,
        leadId: input.leadId,
        amount: dec(input.amount),
        gstAmount: dec(input.gstAmount),
        dueAt: input.dueAt,
        status: input.issue ? 'ISSUED' : 'DRAFT',
        issuedAt: input.issue ? new Date() : null,
      },
    });
  },

  async updateInvoice(id: string, input: UpdateInvoiceInput) {
    const data: Prisma.InvoiceUpdateInput = {};
    if (input.dueAt) data.dueAt = input.dueAt;
    if (input.status) {
      data.status = input.status;
      if (input.status === 'ISSUED') data.issuedAt = new Date();
    }
    return prisma.invoice.update({ where: { id }, data });
  },

  // ---- Payments ----
  async listPayments(query: ListPaymentsInput) {
    const where: Prisma.PaymentWhereInput = {};
    if (query.status) where.status = query.status as never;
    if (query.type) where.type = query.type as never;
    if (query.search) {
      where.OR = [
        { reference: { contains: query.search, mode: 'insensitive' } },
        { payerName: { contains: query.search, mode: 'insensitive' } },
        { transactionRef: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: paymentInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.payment.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) };
  },

  async getPayment(id: string) {
    const payment = await prisma.payment.findUnique({ where: { id }, include: paymentInclude });
    if (!payment) throw HttpError.notFound('Payment not found');
    return payment;
  },

  async recordPayment(input: RecordPaymentInput, actor?: Actor) {
    if (input.invoiceId) await prisma.invoice.findUniqueOrThrow({ where: { id: input.invoiceId } });
    const reference = await nextNumber('payment');
    const status = input.confirmed ? 'CONFIRMED' : input.status ?? 'PENDING';
    const now = new Date();
    const payment = await prisma.payment.create({
      data: {
        reference,
        payerName: input.payerName,
        payerId: input.payerId,
        invoiceId: input.invoiceId,
        leadId: input.leadId,
        studentId: input.studentId,
        courseId: input.courseId,
        amount: dec(input.amount),
        method: input.method,
        type: input.type,
        transactionRef: input.transactionRef,
        installmentNumber: input.installmentNumber,
        notes: input.notes,
        proofUrl: input.proofUrl || undefined,
        paymentDate: input.paymentDate ?? now,
        status,
        verifiedAt: status === 'VERIFIED' || status === 'CONFIRMED' ? now : null,
        confirmedAt: status === 'CONFIRMED' ? now : null,
        paidAt: status === 'CONFIRMED' ? now : null,
        history: [{ action: 'RECORDED', status, at: now, byId: actor?.id, byName: actor?.name }],
      },
      include: paymentInclude,
    });
    if (status === 'CONFIRMED' && input.invoiceId) await reconcileInvoice(input.invoiceId);
    return payment;
  },

  async updatePayment(id: string, input: UpdatePaymentInput, actor?: Actor) {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) throw HttpError.notFound('Payment not found');
    // Unchecked input lets us set scalar foreign keys (invoiceId, leadId, …) directly.
    const data: Prisma.PaymentUncheckedUpdateInput = {};
    if (input.payerName !== undefined) data.payerName = input.payerName;
    if (input.invoiceId !== undefined) data.invoiceId = input.invoiceId;
    if (input.leadId !== undefined) data.leadId = input.leadId;
    if (input.studentId !== undefined) data.studentId = input.studentId;
    if (input.courseId !== undefined) data.courseId = input.courseId;
    if (input.amount !== undefined) data.amount = dec(input.amount);
    if (input.method !== undefined) data.method = input.method;
    if (input.type !== undefined) data.type = input.type;
    if (input.transactionRef !== undefined) data.transactionRef = input.transactionRef;
    if (input.installmentNumber !== undefined) data.installmentNumber = input.installmentNumber;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.proofUrl !== undefined) data.proofUrl = input.proofUrl || undefined;
    if (input.paymentDate !== undefined) data.paymentDate = input.paymentDate;
    data.history = appendHistory(existing.history, { action: 'UPDATED', status: existing.status, at: new Date(), byId: actor?.id, byName: actor?.name });
    const payment = await prisma.payment.update({ where: { id }, data, include: paymentInclude });
    if (input.amount !== undefined && payment.invoiceId) await reconcileInvoice(payment.invoiceId);
    return payment;
  },

  async deletePayment(id: string) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw HttpError.notFound('Payment not found');
    await prisma.payment.delete({ where: { id } });
    if (payment.invoiceId) await reconcileInvoice(payment.invoiceId);
    return { id };
  },

  async verifyPayment(id: string, actor?: Actor, note?: string) {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) throw HttpError.notFound('Payment not found');
    if (existing.status === 'CONFIRMED') throw HttpError.badRequest('Payment is already confirmed.');
    const now = new Date();
    return prisma.payment.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedAt: now,
        verifiedById: actor?.id,
        rejectedAt: null,
        rejectionReason: null,
        history: appendHistory(existing.history, { action: 'VERIFIED', status: 'VERIFIED', at: now, byId: actor?.id, byName: actor?.name, note }),
      },
      include: paymentInclude,
    });
  },

  async confirmPayment(id: string, actor?: Actor, note?: string) {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) throw HttpError.notFound('Payment not found');
    const now = new Date();
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        paidAt: now,
        confirmedAt: now,
        confirmedById: actor?.id,
        rejectedAt: null,
        rejectionReason: null,
        history: appendHistory(existing.history, { action: 'CONFIRMED', status: 'CONFIRMED', at: now, byId: actor?.id, byName: actor?.name, note }),
      },
      include: paymentInclude,
    });
    if (payment.invoiceId) await reconcileInvoice(payment.invoiceId);
    return payment;
  },

  async rejectPayment(id: string, actor?: Actor, reason?: string) {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) throw HttpError.notFound('Payment not found');
    const now = new Date();
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: now,
        rejectedById: actor?.id,
        rejectionReason: reason,
        history: appendHistory(existing.history, { action: 'REJECTED', status: 'REJECTED', at: now, byId: actor?.id, byName: actor?.name, note: reason }),
      },
      include: paymentInclude,
    });
    // A rejected payment no longer counts toward an invoice.
    if (payment.invoiceId) await reconcileInvoice(payment.invoiceId);
    return payment;
  },

  async paymentStats() {
    const [total, confirmedAgg, pendingAgg, confirmedCount, pendingCount] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.aggregate({ where: { status: 'CONFIRMED' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: { in: ['PENDING', 'VERIFIED'] } }, _sum: { amount: true } }),
      prisma.payment.count({ where: { status: 'CONFIRMED' } }),
      prisma.payment.count({ where: { status: { in: ['PENDING', 'VERIFIED'] } } }),
    ]);
    return {
      totalPayments: total,
      totalRevenue: num(confirmedAgg._sum.amount),
      confirmedPayments: confirmedCount,
      confirmedAmount: num(confirmedAgg._sum.amount),
      pendingVerificationCount: pendingCount,
      pendingVerificationAmount: num(pendingAgg._sum.amount),
    };
  },

  // ---- Refunds ----
  async listRefunds() {
    return prisma.refund.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  },
  async createRefund(input: CreateRefundInput, requestedById?: string) {
    return prisma.refund.create({
      data: { clientName: input.clientName, amount: dec(input.amount), reason: input.reason, requestedById, status: 'PENDING' },
    });
  },
  async decideRefund(id: string, input: RefundDecisionInput) {
    return prisma.refund.update({
      where: { id },
      data: { status: input.status, processedAt: input.status === 'PROCESSED' ? new Date() : null },
    });
  },

  // ---- Authority payments ----
  async listAuthorityPayments() {
    return prisma.authorityPayment.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  },
  async createAuthorityPayment(input: { clientName: string; authority: string; type: string; amount: number; paidAt?: Date; recovered?: boolean; status?: string; caseId?: string }) {
    return prisma.authorityPayment.create({
      data: {
        clientName: input.clientName,
        authority: input.authority,
        type: input.type,
        amount: dec(input.amount),
        paidAt: input.paidAt,
        recovered: input.recovered ?? false,
        status: input.status ?? 'PENDING',
        caseId: input.caseId,
      },
    });
  },
  async updateAuthorityPayment(id: string, input: { status?: string; recovered?: boolean }) {
    return prisma.authorityPayment.update({ where: { id }, data: input });
  },

  // ---- Account closures (derived from invoices + confirmed payments) ----
  async closures() {
    const invoices = await prisma.invoice.findMany({
      include: { payments: { where: { status: 'CONFIRMED' }, select: { amount: true } } },
    });
    const map = new Map<string, { client: string; invoiced: number; paid: number; invoiceCount: number }>();
    for (const inv of invoices) {
      const entry = map.get(inv.clientName) ?? { client: inv.clientName, invoiced: 0, paid: 0, invoiceCount: 0 };
      entry.invoiced += num(inv.amount) + num(inv.gstAmount);
      entry.paid += inv.payments.reduce((s: number, p: any) => s + num(p.amount), 0);
      entry.invoiceCount += 1;
      map.set(inv.clientName, entry);
    }
    return [...map.values()]
      .map((e) => {
        const balance = Math.round((e.invoiced - e.paid) * 100) / 100;
        return { ...e, balance, status: balance <= 0 ? 'SETTLED' : e.paid > 0 ? 'PARTIAL' : 'OPEN' };
      })
      .sort((a, b) => b.balance - a.balance);
  },

  // ---- GST ----
  async gstSummary() {
    const issued = await prisma.invoice.findMany({
      where: { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] } },
      select: { amount: true, gstAmount: true, status: true },
    });
    const taxableTurnover = issued.reduce((s, i) => s + num(i.amount), 0);
    const gstCollected = issued.filter((i) => i.status === 'PAID').reduce((s, i) => s + num(i.gstAmount), 0);
    const gstPending = issued.filter((i) => i.status !== 'PAID').reduce((s, i) => s + num(i.gstAmount), 0);
    return { taxableTurnover, gstCollected, gstPending, taxLiability: gstCollected };
  },

  // ---- Dashboard stats ----
  async stats() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [revenueAgg, outstandingInvoices, refundRequests, gst, confirmedThisMonth] = await Promise.all([
      prisma.payment.aggregate({ where: { status: 'CONFIRMED', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.invoice.findMany({
        where: { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } },
        select: { amount: true, gstAmount: true },
      }),
      prisma.refund.count({ where: { status: 'PENDING' } }),
      this.gstSummary(),
      prisma.payment.count({ where: { status: 'CONFIRMED', paidAt: { gte: monthStart } } }),
    ]);

    const pendingCollections = outstandingInvoices.reduce((s, i) => s + num(i.amount) + num(i.gstAmount), 0);

    return {
      revenueMTD: num(revenueAgg._sum.amount),
      pendingCollections,
      outstandingInvoices: outstandingInvoices.length,
      gstCollected: gst.gstCollected,
      refundRequests,
      paymentsThisMonth: confirmedThisMonth,
    };
  },
};
