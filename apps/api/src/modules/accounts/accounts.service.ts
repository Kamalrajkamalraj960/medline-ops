import { prisma, Prisma, type InvoiceStatus } from '@medline/db';
import { HttpError } from '../../lib/http-error.js';
import type {
  CreateInvoiceInput, CreateRefundInput, ListInput, RecordPaymentInput,
  RefundDecisionInput, UpdateInvoiceInput,
} from './accounts.schema.js';

const dec = (n: number) => new Prisma.Decimal(n);
const num = (d: Prisma.Decimal | null | undefined) => (d ? Number(d) : 0);

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
  async listPayments(query: ListInput) {
    const where: Prisma.PaymentWhereInput = {};
    if (query.status) where.status = query.status as never;
    if (query.search) {
      where.OR = [
        { reference: { contains: query.search, mode: 'insensitive' } },
        { payerName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { invoice: { select: { number: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.payment.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) };
  },

  async recordPayment(input: RecordPaymentInput) {
    if (input.invoiceId) await prisma.invoice.findUniqueOrThrow({ where: { id: input.invoiceId } });
    const reference = await nextNumber('payment');
    const payment = await prisma.payment.create({
      data: {
        reference,
        payerName: input.payerName,
        invoiceId: input.invoiceId,
        amount: dec(input.amount),
        method: input.method,
        proofUrl: input.proofUrl,
        status: input.confirmed ? 'CONFIRMED' : 'PENDING',
        paidAt: input.confirmed ? new Date() : null,
      },
    });
    if (input.confirmed && input.invoiceId) await reconcileInvoice(input.invoiceId);
    return payment;
  },

  async confirmPayment(id: string) {
    const payment = await prisma.payment.update({
      where: { id }, data: { status: 'CONFIRMED', paidAt: new Date() },
    });
    if (payment.invoiceId) await reconcileInvoice(payment.invoiceId);
    return payment;
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
      entry.paid += inv.payments.reduce((s, p) => s + num(p.amount), 0);
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
