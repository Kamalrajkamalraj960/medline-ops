import { prisma } from '@medline/db';
import { HttpError } from '../../lib/http-error.js';
import {
  AUTHORITY_CARDS, DUE_SOON_DAYS, OVERDUE_DAYS, TERMINAL_STATUSES,
} from './authority.constants.js';
import type {
  CreateAuthorityInput, FollowUpInput, ListAuthorityInput, StatusUpdateInput,
  UpdateAuthorityInput, UploadDocumentInput,
} from './authority.schema.js';

const DAY = 86_400_000;

export type FollowUpStatus = 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE' | 'RESOLVED';

const trackingInclude = {
  case: {
    include: {
      lead: { select: { id: true, name: true, phone: true, email: true, profession: true } },
    },
  },
  followUps: { orderBy: { createdAt: 'desc' as const } },
} as const;

/** Days the submission has been pending; 0 once a terminal status is reached. */
function computeDaysPending(t: { status: string; submissionDate?: Date | null; createdAt: Date }): number {
  if ((TERMINAL_STATUSES as string[]).includes(t.status)) return 0;
  const base = t.submissionDate ? new Date(t.submissionDate) : new Date(t.createdAt);
  return Math.max(0, Math.floor((Date.now() - base.getTime()) / DAY));
}

function computeFollowUpStatus(days: number, terminal: boolean): FollowUpStatus {
  if (terminal) return 'RESOLVED';
  if (days >= OVERDUE_DAYS) return 'OVERDUE';
  if (days >= DUE_SOON_DAYS) return 'DUE_SOON';
  return 'ON_TRACK';
}

/** Flattens a tracking row (+ case/lead) into the shape the UI consumes. */
function decorate(t: any) {
  const terminal = TERMINAL_STATUSES.includes(t.status);
  const daysPending = computeDaysPending(t);
  return {
    id: t.id,
    caseId: t.caseId,
    caseReference: t.case?.reference ?? null,
    clientName: t.case?.lead?.name ?? '—',
    clientPhone: t.case?.lead?.phone ?? null,
    clientEmail: t.case?.lead?.email ?? null,
    profession: t.case?.profession ?? t.case?.lead?.profession ?? null,
    authority: t.authority,
    referenceNumber: t.referenceNumber ?? null,
    status: t.status,
    submissionDate: t.submissionDate ?? null,
    expectedCompletionDate: t.expectedCompletionDate ?? null,
    lastResponseAt: t.lastResponseAt ?? null,
    notes: t.notes ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    daysPending,
    followUpStatus: computeFollowUpStatus(daysPending, terminal),
  };
}

async function logEvent(trackingId: string, type: string, notes?: string, dueAt?: Date) {
  return prisma.authorityFollowUp.create({ data: { trackingId, type, notes, dueAt } });
}

export const authorityService = {
  async list(query: ListAuthorityInput) {
    const where: Record<string, unknown> = {};
    if (query.authority && query.authority !== 'all') where.authority = query.authority;
    if (query.status && query.status !== 'all') where.status = query.status;

    const rows = await prisma.authorityTracking.findMany({
      where,
      include: trackingInclude,
      orderBy: { createdAt: 'desc' },
    });

    let items = rows.map(decorate);
    if (query.search) {
      const q = query.search.toLowerCase();
      items = items.filter(
        (i) =>
          (i.clientName ?? '').toLowerCase().includes(q) ||
          (i.caseReference ?? '').toLowerCase().includes(q) ||
          (i.referenceNumber ?? '').toLowerCase().includes(q),
      );
    }
    // Most pressing (highest days pending) first.
    items.sort((a, b) => b.daysPending - a.daysPending);
    return { items, total: items.length };
  },

  async get(id: string) {
    const t: any = await prisma.authorityTracking.findUnique({
      where: { id },
      include: {
        ...trackingInclude,
        case: {
          include: {
            lead: { select: { id: true, name: true, phone: true, email: true, profession: true } },
            documents: { select: { id: true, category: true, status: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });
    if (!t) throw HttpError.notFound('Authority record not found');

    const detail = decorate(t);

    // Build a chronological timeline from the data we have.
    const timeline: { at: Date; event: string; detail?: string }[] = [];
    if (t.case?.openedAt || t.case?.createdAt) timeline.push({ at: t.case.openedAt ?? t.case.createdAt, event: 'Case Created', detail: t.case?.reference });
    timeline.push({ at: t.createdAt, event: 'Authority Tracking Started', detail: t.authority });
    for (const d of t.case?.documents ?? []) {
      if (d.status !== 'MISSING') timeline.push({ at: d.createdAt, event: 'Document Uploaded', detail: d.category });
    }
    if (t.submissionDate) timeline.push({ at: t.submissionDate, event: 'Submitted to Authority', detail: t.referenceNumber ?? undefined });
    for (const f of t.followUps ?? []) {
      const label = f.type === 'STATUS_CHANGE' ? 'Status Updated' : f.type === 'DOCUMENT' ? 'Document Added' : 'Follow-up';
      timeline.push({ at: f.createdAt, event: label, detail: f.notes ?? undefined });
    }
    timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return { ...detail, timeline, followUps: t.followUps ?? [] };
  },

  async create(input: CreateAuthorityInput, createdById?: string) {
    const c = await prisma.consultancyCase.findUnique({ where: { id: input.caseId } });
    if (!c) throw HttpError.notFound('Consultancy case not found');
    const existing = await prisma.authorityTracking.findUnique({ where: { caseId: input.caseId } });
    if (existing) throw HttpError.conflict('This case already has authority tracking', { id: existing.id });

    const created = await prisma.authorityTracking.create({
      data: {
        caseId: input.caseId,
        authority: input.authority,
        referenceNumber: input.referenceNumber,
        status: input.status ?? 'NOT_STARTED',
        submissionDate: input.submissionDate,
        expectedCompletionDate: input.expectedCompletionDate,
        notes: input.notes,
        createdById,
      },
    });
    await logEvent(created.id, 'CREATED', `Tracking opened for ${input.authority}`);
    return this.get(created.id);
  },

  async update(id: string, input: UpdateAuthorityInput) {
    const existing = await prisma.authorityTracking.findUnique({ where: { id } });
    if (!existing) throw HttpError.notFound('Authority record not found');
    await prisma.authorityTracking.update({
      where: { id },
      data: {
        authority: input.authority ?? existing.authority,
        referenceNumber: input.referenceNumber ?? existing.referenceNumber,
        submissionDate: input.submissionDate ?? existing.submissionDate,
        expectedCompletionDate: input.expectedCompletionDate ?? existing.expectedCompletionDate,
        status: input.status ?? existing.status,
        notes: input.notes ?? existing.notes,
        lastResponseAt: new Date(),
      },
    });
    return this.get(id);
  },

  async setStatus(id: string, input: StatusUpdateInput) {
    const existing = await prisma.authorityTracking.findUnique({ where: { id } });
    if (!existing) throw HttpError.notFound('Authority record not found');
    const data: Record<string, unknown> = { status: input.status, lastResponseAt: new Date() };
    // First move into SUBMITTED stamps the submission date.
    if (input.status === 'SUBMITTED' && !existing.submissionDate) data.submissionDate = new Date();
    await prisma.authorityTracking.update({ where: { id }, data });
    await logEvent(id, 'STATUS_CHANGE', input.note ?? `Status changed to ${input.status}`);
    return this.get(id);
  },

  async addFollowUp(id: string, input: FollowUpInput) {
    const existing = await prisma.authorityTracking.findUnique({ where: { id } });
    if (!existing) throw HttpError.notFound('Authority record not found');
    await prisma.authorityTracking.update({ where: { id }, data: { lastResponseAt: new Date() } });
    await logEvent(id, input.type ?? 'FOLLOW_UP', input.notes, input.dueAt);
    return this.get(id);
  },

  async uploadDocument(id: string, input: UploadDocumentInput) {
    const tracking = await prisma.authorityTracking.findUnique({ where: { id } });
    if (!tracking) throw HttpError.notFound('Authority record not found');
    await prisma.document.create({
      data: {
        caseId: tracking.caseId,
        category: input.category,
        fileUrl: input.fileUrl,
        status: input.fileUrl ? 'UPLOADED' : 'MISSING',
        versions: input.fileUrl ? { create: { version: 1, fileUrl: input.fileUrl } } : undefined,
      },
    });
    await logEvent(id, 'DOCUMENT', `Uploaded ${input.category}`);
    return this.get(id);
  },

  async remove(id: string) {
    const existing = await prisma.authorityTracking.findUnique({ where: { id } });
    if (!existing) throw HttpError.notFound('Authority record not found');
    await prisma.authorityFollowUp.deleteMany({ where: { trackingId: id } });
    await prisma.authorityTracking.delete({ where: { id } });
    return { id };
  },

  async stats() {
    const rows = await prisma.authorityTracking.findMany({ select: { authority: true, status: true, submissionDate: true, createdAt: true } });
    const decorated = rows.map((r) => ({ authority: r.authority, ...{ daysPending: computeDaysPending(r as any), terminal: TERMINAL_STATUSES.includes(r.status) } }));

    const byAuthority: Record<string, number> = {};
    for (const a of AUTHORITY_CARDS) byAuthority[a] = 0;
    let overdue = 0;
    for (const d of decorated) {
      if (!d.terminal) {
        if (d.authority in byAuthority) byAuthority[d.authority] += 1;
        if (d.daysPending >= OVERDUE_DAYS) overdue += 1;
      }
    }
    return {
      casesWithAuthorities: rows.length,
      overdueFollowUps: overdue,
      cards: AUTHORITY_CARDS.map((a) => ({ authority: a, activeCases: byAuthority[a] })),
    };
  },

  /** Creates one notification per overdue active case for its assigned officer. */
  async notifyOverdue() {
    const rows: any[] = await prisma.authorityTracking.findMany({
      where: { status: { notIn: TERMINAL_STATUSES } },
      include: { case: { select: { reference: true, assignedOfficerId: true } } },
    });
    let created = 0;
    for (const t of rows) {
      const days = computeDaysPending(t);
      if (days < OVERDUE_DAYS) continue;
      const userId = t.case?.assignedOfficerId;
      if (!userId) continue;
      const ref = t.case?.reference ?? t.caseId;
      // De-dupe: skip if an unread overdue notice already exists for this case.
      const dupe = await prisma.notification.findFirst({
        where: { userId, event: 'AUTHORITY_OVERDUE', body: { contains: ref }, readAt: null },
      });
      if (dupe) continue;
      await prisma.notification.create({
        data: {
          userId,
          event: 'AUTHORITY_OVERDUE',
          title: `Authority follow-up overdue (${t.authority})`,
          body: `${ref} has been pending ${days} days with ${t.authority}. Please follow up.`,
        },
      });
      created += 1;
    }
    return { created };
  },
};
