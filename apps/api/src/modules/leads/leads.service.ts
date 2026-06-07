import { prisma, type Prisma } from '@medline/db';
import { HttpError } from '../../lib/http-error.js';
import type { CreateLeadInput, ListLeadsInput, UpdateLeadInput } from './leads.schema.js';

/** Generates the next LD-YYYY-#### reference for the given year. */
async function nextLeadReference(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `LD-${year}-`;
  const last = await prisma.lead.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: 'desc' },
    select: { reference: true },
  });
  const lastNum = last ? Number(last.reference.slice(prefix.length)) : 0;
  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
}

/** Finds possible duplicates by phone, email, passport, or national id. */
export async function findDuplicates(input: {
  phone?: string; email?: string; passport?: string; nationalId?: string;
}) {
  const or: Prisma.LeadWhereInput[] = [];
  if (input.phone) or.push({ phone: input.phone });
  if (input.email) or.push({ email: input.email });
  if (input.passport) or.push({ passport: input.passport });
  if (input.nationalId) or.push({ nationalId: input.nationalId });
  if (or.length === 0) return [];

  return prisma.lead.findMany({
    where: { OR: or },
    select: { id: true, reference: true, name: true, phone: true, email: true, status: true, serviceType: true },
    take: 5,
  });
}

export const leadsService = {
  async list(query: ListLeadsInput) {
    const where: Prisma.LeadWhereInput = {};
    if (query.status) where.status = query.status as never;
    if (query.serviceType) where.serviceType = query.serviceType;
    if (query.ownerId) where.ownerId = query.ownerId;
    if (query.priority) where.priority = query.priority as never;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { reference: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: { owner: { select: { id: true, name: true } }, source: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) };
  },

  async get(id: string) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        source: true,
        campaign: true,
        activities: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { name: true } } } },
      },
    });
    if (!lead) throw HttpError.notFound('Lead not found');
    return lead;
  },

  async checkDuplicates(input: { phone?: string; email?: string; passport?: string; nationalId?: string }) {
    return findDuplicates(input);
  },

  async create(input: CreateLeadInput, createdById: string) {
    // Defence in depth: schema already blocks "both", but never trust it alone.
    if ((input.serviceType as string) === 'both') {
      throw HttpError.badRequest("Service type 'both' is not allowed. Choose consultancy or academy.");
    }

    if (!input.forceCreate) {
      const dupes = await findDuplicates(input);
      if (dupes.length > 0) {
        throw HttpError.conflict('Possible duplicate lead detected', {
          duplicates: dupes,
          hint: 'Resubmit with forceCreate=true to create anyway.',
        });
      }
    }

    const reference = await nextLeadReference();
    const { forceCreate, sourceId, campaignId, ownerId, ...rest } = input;

    return prisma.lead.create({
      data: {
        ...rest,
        reference,
        tags: rest.tags ?? [],
        createdById,
        ownerId: ownerId ?? null,
        sourceId: sourceId ?? null,
        campaignId: campaignId ?? null,
        // legacyBothFlag is intentionally never settable from the API.
      },
    });
  },

  async update(id: string, input: UpdateLeadInput) {
    if ((input.serviceType as string | undefined) === 'both') {
      throw HttpError.badRequest("Service type 'both' is not allowed.");
    }
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) throw HttpError.notFound('Lead not found');

    const data: Prisma.LeadUpdateInput = { ...input } as Prisma.LeadUpdateInput;
    if (input.status === 'CONVERTED' && existing.status !== 'CONVERTED') {
      data.convertedAt = new Date();
    }

    return prisma.lead.update({ where: { id }, data });
  },

  async assign(id: string, ownerId: string) {
    await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
    return prisma.lead.update({ where: { id }, data: { ownerId } });
  },

  async remove(id: string) {
    await prisma.lead.delete({ where: { id } });
  },

  /** Counts for the CRM dashboard cards. */
  async stats(ownerId?: string) {
    const base: Prisma.LeadWhereInput = ownerId ? { ownerId } : {};
    const [total, byStatus, byService, legacyBoth] = await Promise.all([
      prisma.lead.count({ where: base }),
      prisma.lead.groupBy({ by: ['status'], where: base, _count: true }),
      prisma.lead.groupBy({ by: ['serviceType'], where: base, _count: true }),
      prisma.lead.count({ where: { ...base, legacyBothFlag: true } }),
    ]);
    return { total, byStatus, byService, legacyBothNeedsReview: legacyBoth };
  },
};
