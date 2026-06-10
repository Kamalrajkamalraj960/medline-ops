import { prisma, type Prisma, type CaseStatus } from '@medline/db';
import { HttpError } from '../../lib/http-error.js';
import { buildDocumentKey, presignDownload, presignUpload } from '../../lib/storage.js';
import { CLOSED_STATUSES, PROGRESS_BY_STATUS, QUEUE_STATUSES } from './consultancy.constants.js';
import type {
  AddDocumentInput, AddFollowUpInput, AuthorityUpdateInput, CreateCaseInput,
  ListCasesInput, UpdateDocumentInput,
} from './consultancy.schema.js';

async function nextReference(model: 'case' | 'lead'): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = model === 'case' ? `CC-${year}-` : `LD-${year}-`;
  // Branch instead of a shared delegate variable: Prisma's per-model delegate
  // types don't unify into a single callable signature.
  const last =
    model === 'case'
      ? await prisma.consultancyCase.findFirst({
          where: { reference: { startsWith: prefix } },
          orderBy: { reference: 'desc' },
          select: { reference: true },
        })
      : await prisma.lead.findFirst({
          where: { reference: { startsWith: prefix } },
          orderBy: { reference: 'desc' },
          select: { reference: true },
        });
  const lastNum = last ? Number(last.reference.slice(prefix.length)) : 0;
  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
}

export const consultancyService = {
  async list(query: ListCasesInput) {
    const where: Prisma.ConsultancyCaseWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.authority) where.authority = query.authority;
    if (query.queue) where.status = { in: QUEUE_STATUSES };
    if (query.search) {
      where.OR = [
        { reference: { contains: query.search, mode: 'insensitive' } },
        { lead: { name: { contains: query.search, mode: 'insensitive' } } },
        { lead: { phone: { contains: query.search } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.consultancyCase.findMany({
        where,
        include: {
          lead: { select: { name: true, phone: true, serviceType: true } },
          authorityTracking: { select: { status: true, referenceNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.consultancyCase.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) };
  },

  async get(id: string) {
    const c = await prisma.consultancyCase.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true, profession: true, serviceType: true } },
        documents: { orderBy: { createdAt: 'asc' }, include: { versions: { orderBy: { version: 'desc' } } } },
        authorityTracking: { include: { followUps: { orderBy: { createdAt: 'desc' } } } },
      },
    });
    if (!c) throw HttpError.notFound('Case not found');
    return c;
  },

  async createCase(input: CreateCaseInput) {
    let leadId = input.leadId;

    if (leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) throw HttpError.notFound('Lead not found');
      if (lead.serviceType !== 'consultancy') {
        throw HttpError.badRequest('Only consultancy leads can become consultancy cases.');
      }
      const existing = await prisma.consultancyCase.findUnique({ where: { leadId } });
      if (existing) throw HttpError.conflict('A case already exists for this lead', { caseId: existing.id });
      // Advance the lead into the documentation stage.
      await prisma.lead.update({ where: { id: leadId }, data: { status: 'DOCUMENTATION' } });
    } else {
      // Inline capture: create a backing consultancy lead for the case.
      const ref = await nextReference('lead');
      const lead = await prisma.lead.create({
        data: {
          reference: ref,
          name: input.clientName!,
          phone: 'N/A',
          serviceType: 'consultancy',
          status: 'DOCUMENTATION',
        },
      });
      leadId = lead.id;
    }

    const reference = await nextReference('case');
    return prisma.consultancyCase.create({
      data: {
        reference,
        leadId: leadId!,
        authority: input.authority,
        profession: input.profession,
        priority: input.priority ?? 'MEDIUM',
        assignedOfficerId: input.assignedOfficerId,
        status: 'DOCUMENT_COLLECTION',
        progressPct: PROGRESS_BY_STATUS.DOCUMENT_COLLECTION,
        // Initialise authority tracking alongside the case.
        authorityTracking: { create: { authority: input.authority, status: 'NOT_STARTED' } },
      },
      include: { lead: { select: { name: true } } },
    });
  },

  async updateStatus(id: string, status: CaseStatus) {
    const existing = await prisma.consultancyCase.findUnique({ where: { id } });
    if (!existing) throw HttpError.notFound('Case not found');

    return prisma.consultancyCase.update({
      where: { id },
      data: {
        status,
        progressPct: PROGRESS_BY_STATUS[status],
        closedAt: CLOSED_STATUSES.includes(status) ? new Date() : null,
      },
    });
  },

  async addDocument(caseId: string, input: AddDocumentInput) {
    await prisma.consultancyCase.findUniqueOrThrow({ where: { id: caseId } });
    return prisma.document.create({
      data: {
        caseId,
        category: input.category,
        fileUrl: input.fileUrl,
        status: input.fileUrl ? 'UPLOADED' : 'MISSING',
        versions: input.fileUrl
          ? { create: { version: 1, fileUrl: input.fileUrl } }
          : undefined,
      },
    });
  },

  /** Returns a presigned PUT URL + the object key for a document upload. */
  async presignDocumentUpload(documentId: string, fileName: string, contentType: string) {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw HttpError.notFound('Document not found');
    const key = buildDocumentKey(doc.caseId, documentId, fileName);
    const uploadUrl = await presignUpload(key, contentType);
    return { uploadUrl, key };
  },

  /** Returns a short-lived presigned GET URL for an uploaded document. */
  async getDocumentDownloadUrl(documentId: string) {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw HttpError.notFound('Document not found');
    if (!doc.fileUrl) throw HttpError.notFound('No file uploaded for this document');
    return { url: await presignDownload(doc.fileUrl, `${doc.category}.pdf`) };
  },

  async updateDocument(documentId: string, input: UpdateDocumentInput, reviewerId?: string) {
    const doc = await prisma.document.findUnique({ where: { id: documentId }, include: { versions: true } });
    if (!doc) throw HttpError.notFound('Document not found');

    const data: Prisma.DocumentUpdateInput = {
      status: input.status,
      rejectionReason: input.status === 'REJECTED' ? input.rejectionReason : null,
    };
    if (input.status === 'VERIFIED' || input.status === 'REJECTED') data.reviewerId = reviewerId ?? null;

    // A new file URL creates the next version.
    if (input.fileUrl && input.fileUrl !== doc.fileUrl) {
      data.fileUrl = input.fileUrl;
      data.versions = { create: { version: doc.versions.length + 1, fileUrl: input.fileUrl, uploadedById: reviewerId } };
    }

    return prisma.document.update({ where: { id: documentId }, data });
  },

  async updateAuthority(caseId: string, input: AuthorityUpdateInput) {
    const tracking = await prisma.authorityTracking.findUnique({ where: { caseId } });
    if (!tracking) throw HttpError.notFound('Authority tracking not found for case');
    return prisma.authorityTracking.update({
      where: { caseId },
      data: {
        status: input.status,
        referenceNumber: input.referenceNumber ?? tracking.referenceNumber,
        submissionDate: input.submissionDate ?? tracking.submissionDate,
        lastResponseAt: new Date(),
      },
    });
  },

  async addFollowUp(caseId: string, input: AddFollowUpInput) {
    const tracking = await prisma.authorityTracking.findUnique({ where: { caseId } });
    if (!tracking) throw HttpError.notFound('Authority tracking not found for case');
    return prisma.authorityFollowUp.create({
      data: { trackingId: tracking.id, type: input.type, dueAt: input.dueAt, notes: input.notes },
    });
  },

  async completeFollowUp(followUpId: string) {
    return prisma.authorityFollowUp.update({
      where: { id: followUpId },
      data: { completedAt: new Date() },
    });
  },

  async stats() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [pendingSubmissions, withAuthorities, completedThisMonth, overdueFollowUps, docsPendingVerification] =
      await Promise.all([
        prisma.consultancyCase.count({ where: { status: { in: QUEUE_STATUSES } } }),
        prisma.consultancyCase.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_DOCS_REQUIRED'] } } }),
        prisma.consultancyCase.count({ where: { status: 'COMPLETED', closedAt: { gte: monthStart } } }),
        prisma.authorityFollowUp.count({ where: { completedAt: null, dueAt: { lt: now } } }),
        prisma.document.count({ where: { status: { in: ['UPLOADED', 'UNDER_REVIEW'] } } }),
      ]);
    return { pendingSubmissions, withAuthorities, completedThisMonth, overdueFollowUps, docsPendingVerification };
  },
};
