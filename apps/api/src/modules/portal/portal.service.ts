import { prisma, type CaseStatus } from '@medline/db';
import { HttpError } from '../../lib/http-error.js';
import { buildDocumentKey, presignDownload, presignUpload } from '../../lib/storage.js';

/** The client-facing 8-step journey. */
const JOURNEY = [
  'Gathering Your Documents',
  'Verifying Your Credentials',
  'Authority Review',
  'Exam Preparation',
  'Eligibility Confirmed',
  'Exam Passed',
  'License Processing',
  'Journey Complete',
];

/** Maps an internal case status to the client journey step (1-based). */
function journeyStep(status: CaseStatus): number {
  switch (status) {
    case 'DOCUMENT_COLLECTION': return 1;
    case 'VERIFICATION': return 2;
    case 'READY_FOR_SUBMISSION':
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
    case 'ADDITIONAL_DOCS_REQUIRED': return 3;
    case 'EXAM_SCHEDULED': return 4;
    case 'ELIGIBILITY_RECEIVED': return 5;
    case 'EXAM_PASSED': return 6;
    case 'LICENSE_PROCESSING': return 7;
    case 'COMPLETED': return 8;
    default: return 1;
  }
}

/** Resolves the lead a portal user is allowed to see. Throws if none linked. */
async function requirePortalLeadId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { portalLeadId: true } });
  if (!user?.portalLeadId) {
    throw HttpError.forbidden('No application is linked to this account yet. Please contact your executive.');
  }
  return user.portalLeadId;
}

export const portalService = {
  async overview(userId: string) {
    const leadId = await requirePortalLeadId(userId);
    const lead = await prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      include: {
        owner: { select: { name: true, email: true, phone: true, avatarUrl: true } },
        case: { include: { documents: true, authorityTracking: true } },
        student: { include: { course: { select: { name: true } }, batch: { select: { code: true, timing: true } } } },
      },
    });

    const documents = lead.case?.documents ?? [];
    const docsVerified = documents.filter((d) => d.status === 'VERIFIED').length;
    const docsPending = documents.filter((d) => d.status !== 'VERIFIED').length;

    // Payment summary across this client's invoices.
    const invoices = await prisma.invoice.findMany({
      where: { leadId },
      include: { payments: { where: { status: 'CONFIRMED' }, select: { amount: true } } },
    });
    const totalFee = invoices.reduce((s, i) => s + Number(i.amount) + Number(i.gstAmount), 0);
    const totalPaid = invoices.reduce((s, i) => s + i.payments.reduce((p, x) => p + Number(x.amount), 0), 0);

    const isConsultancy = lead.serviceType === 'consultancy';
    const currentStep = lead.case ? journeyStep(lead.case.status) : lead.student?.status === 'COMPLETED' ? 8 : 3;
    const progressPct = lead.case?.progressPct ?? lead.student?.progressPct ?? 0;

    return {
      profile: { name: lead.name, serviceType: lead.serviceType },
      executive: lead.owner
        ? { name: lead.owner.name, email: lead.owner.email, phone: lead.owner.phone, avatarUrl: lead.owner.avatarUrl }
        : null,
      application: {
        type: lead.serviceType,
        reference: lead.case?.reference ?? lead.student?.reference ?? lead.reference,
        authority: lead.case?.authority ?? null,
        course: lead.student?.course?.name ?? null,
        batch: lead.student?.batch?.code ?? null,
        stage: lead.case?.status ?? lead.student?.status ?? lead.status,
        progressPct,
        authorityStatus: lead.case?.authorityTracking?.status ?? null,
        authorityReference: lead.case?.authorityTracking?.referenceNumber ?? null,
      },
      journey: isConsultancy
        ? JOURNEY.map((label, idx) => ({
            step: idx + 1,
            label,
            state: idx + 1 < currentStep ? 'done' : idx + 1 === currentStep ? 'current' : 'upcoming',
          }))
        : [],
      documents: { verified: docsVerified, pending: docsPending, total: documents.length },
      payment: { totalFee, totalPaid, balance: totalFee - totalPaid },
    };
  },

  async documents(userId: string) {
    const leadId = await requirePortalLeadId(userId);
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, include: { case: true } });
    if (!lead.case) return [];
    return prisma.document.findMany({
      where: { caseId: lead.case.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, category: true, status: true, rejectionReason: true, fileUrl: true },
    });
  },

  /** Loads a document only if it belongs to this client's own case. */
  async requireOwnedDocument(userId: string, documentId: string) {
    const leadId = await requirePortalLeadId(userId);
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, include: { case: true } });
    if (!lead.case) throw HttpError.notFound('No case found');
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc || doc.caseId !== lead.case.id) throw HttpError.forbidden('Document does not belong to your application');
    return doc;
  },

  /** Presigned PUT URL so the client can upload their file directly to S3. */
  async presignUpload(userId: string, documentId: string, fileName: string, contentType: string) {
    const doc = await this.requireOwnedDocument(userId, documentId);
    const key = buildDocumentKey(doc.caseId, documentId, fileName);
    const uploadUrl = await presignUpload(key, contentType);
    return { uploadUrl, key };
  },

  async getDownloadUrl(userId: string, documentId: string) {
    const doc = await this.requireOwnedDocument(userId, documentId);
    if (!doc.fileUrl) throw HttpError.notFound('No file uploaded yet');
    return { url: await presignDownload(doc.fileUrl, `${doc.category}.pdf`) };
  },

  async uploadDocument(userId: string, documentId: string, fileUrl: string) {
    await this.requireOwnedDocument(userId, documentId);
    const versions = await prisma.documentVersion.count({ where: { documentId } });
    return prisma.document.update({
      where: { id: documentId },
      data: {
        fileUrl,
        status: 'UPLOADED',
        rejectionReason: null,
        versions: { create: { version: versions + 1, fileUrl } },
      },
      select: { id: true, category: true, status: true },
    });
  },

  async payments(userId: string) {
    const leadId = await requirePortalLeadId(userId);
    return prisma.invoice.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: { payments: { orderBy: { createdAt: 'desc' }, select: { reference: true, amount: true, method: true, status: true, paidAt: true } } },
    });
  },

  async createSupportRequest(userId: string, subject: string, message: string) {
    const leadId = await requirePortalLeadId(userId);
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, select: { name: true, ownerId: true } });
    // Routed to the assigned executive as a task.
    return prisma.task.create({
      data: {
        title: `Support: ${subject}`,
        description: `From ${lead.name}: ${message}`,
        status: 'NEW',
        priority: 'MEDIUM',
        department: 'OPERATIONS',
        assigneeId: lead.ownerId,
        createdById: userId,
      },
      select: { id: true, title: true, status: true },
    });
  },
};
