import { prisma, Prisma } from '@medline/db';
import type {
  CreateCampaignInput, CreateSourceInput, UpdateCampaignInput, UpdateSourceInput,
} from './marketing.schema.js';

const dec = (n: number) => new Prisma.Decimal(n);
const num = (d: Prisma.Decimal | null | undefined) => (d ? Number(d) : 0);

export const marketingService = {
  // ---- Lead sources ----
  async listSources() {
    const sources = await prisma.leadSource.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { leads: true, campaigns: true } } },
    });
    // Conversions per source (status CONVERTED).
    const conversions = await prisma.lead.groupBy({
      by: ['sourceId'],
      where: { status: 'CONVERTED', sourceId: { not: null } },
      _count: true,
    });
    const convMap = new Map(conversions.map((c) => [c.sourceId, c._count]));
    return sources.map((s) => ({
      ...s,
      leads: s._count.leads,
      campaigns: s._count.campaigns,
      conversions: convMap.get(s.id) ?? 0,
      conversionRate: s._count.leads ? Math.round(((convMap.get(s.id) ?? 0) / s._count.leads) * 1000) / 10 : 0,
    }));
  },
  async createSource(input: CreateSourceInput) {
    return prisma.leadSource.create({ data: input });
  },
  async updateSource(id: string, input: UpdateSourceInput) {
    return prisma.leadSource.update({ where: { id }, data: input });
  },

  // ---- Campaigns ----
  async listCampaigns() {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { source: { select: { name: true } }, _count: { select: { leads: true } } },
    });
    const conversions = await prisma.lead.groupBy({
      by: ['campaignId'],
      where: { status: 'CONVERTED', campaignId: { not: null } },
      _count: true,
    });
    const convMap = new Map(conversions.map((c) => [c.campaignId, c._count]));
    return campaigns.map((c) => {
      const leads = c._count.leads;
      const conv = convMap.get(c.id) ?? 0;
      const spend = num(c.spend);
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        serviceType: c.serviceType,
        source: c.source,
        budget: num(c.budget),
        spend,
        leads,
        conversions: conv,
        costPerLead: leads ? Math.round((spend / leads) * 100) / 100 : 0,
        conversionRate: leads ? Math.round((conv / leads) * 1000) / 10 : 0,
      };
    });
  },
  async createCampaign(input: CreateCampaignInput) {
    return prisma.campaign.create({
      data: {
        name: input.name,
        type: input.type,
        serviceType: input.serviceType,
        sourceId: input.sourceId,
        budget: input.budget != null ? dec(input.budget) : null,
        spend: input.spend != null ? dec(input.spend) : null,
        startDate: input.startDate,
        endDate: input.endDate,
        status: 'DRAFT',
      },
    });
  },
  async updateCampaign(id: string, input: UpdateCampaignInput) {
    const data: Prisma.CampaignUpdateInput = {};
    if (input.status) data.status = input.status;
    if (input.spend != null) data.spend = dec(input.spend);
    if (input.budget != null) data.budget = dec(input.budget);
    return prisma.campaign.update({ where: { id }, data });
  },

  // ---- Creative library ----
  async listCreatives() {
    return prisma.creativeAsset.findMany({ orderBy: { createdAt: 'desc' } });
  },
  async createCreative(input: { name: string; type: string; category?: string; url?: string; tags?: string[] }) {
    return prisma.creativeAsset.create({
      data: { name: input.name, type: input.type, category: input.category, url: input.url, tags: input.tags ?? [], status: 'DRAFT' },
    });
  },
  async updateCreative(id: string, input: { status?: string; url?: string }) {
    return prisma.creativeAsset.update({ where: { id }, data: input });
  },
  async deleteCreative(id: string) {
    await prisma.creativeAsset.delete({ where: { id } });
  },

  // ---- Stats / analytics ----
  async stats() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [leadsThisMonth, totalLeads, converted, activeCampaigns, campaigns, sources] = await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'CONVERTED' } }),
      prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      prisma.campaign.findMany({ select: { spend: true } }),
      prisma.leadSource.findMany({ include: { _count: { select: { leads: true } } } }),
    ]);

    const totalSpend = campaigns.reduce((s, c) => s + num(c.spend), 0);
    const costPerLead = totalLeads ? Math.round((totalSpend / totalLeads) * 100) / 100 : 0;
    const conversionRate = totalLeads ? Math.round((converted / totalLeads) * 1000) / 10 : 0;
    const best = sources.sort((a, b) => b._count.leads - a._count.leads)[0];

    return {
      leadsThisMonth,
      costPerLead,
      conversionRate,
      bestSource: best?.name ?? '—',
      activeCampaigns,
      totalSpend,
    };
  },
};
