import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { authorize } from '../../middleware/authorize.js';
import { HttpError } from '../../lib/http-error.js';
import { REPORT_SOURCES } from './reports.config.js';

const router = Router();

// Catalog for the report builder UI.
router.get('/meta', authorize('report:view'), (_req, res) => {
  res.json(
    Object.entries(REPORT_SOURCES).map(([key, s]) => ({
      key,
      label: s.label,
      dimensions: s.dimensions,
      hasSum: Boolean(s.sumField),
      sumLabel: s.sumField,
    })),
  );
});

const runSchema = z.object({
  source: z.string(),
  groupBy: z.string(),
  metric: z.enum(['count', 'sum']).default('count'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

router.post('/run', authorize('report:view'), asyncHandler(async (req, res) => {
  const q = runSchema.parse(req.body);

  const source = REPORT_SOURCES[q.source];
  if (!source) throw HttpError.badRequest('Unknown report source');

  const dim = source.dimensions.find((d) => d.field === q.groupBy);
  if (!dim) throw HttpError.badRequest('Invalid group-by field for this source');

  if (q.metric === 'sum' && !source.sumField) {
    throw HttpError.badRequest('This source does not support a sum metric');
  }

  // Date range filter on the source's whitelisted date field.
  const where: Record<string, unknown> = {};
  if (q.from || q.to) {
    where[source.dateField] = {
      ...(q.from ? { gte: q.from } : {}),
      ...(q.to ? { lte: q.to } : {}),
    };
  }

  const groupArgs: Record<string, unknown> = {
    by: [q.groupBy],
    where,
    _count: true,
  };
  if (q.metric === 'sum' && source.sumField) {
    groupArgs._sum = { [source.sumField]: true };
  }

  const grouped = (await source.delegate.groupBy(groupArgs)) as Array<Record<string, unknown>>;

  const rows = grouped.map((g) => {
    const label = g[q.groupBy];
    const value =
      q.metric === 'sum' && source.sumField
        ? Number((g._sum as Record<string, unknown> | undefined)?.[source.sumField] ?? 0)
        : Number(g._count ?? 0);
    return { label: label == null ? '—' : String(label), value };
  });

  rows.sort((a, b) => (q.sort === 'asc' ? a.value - b.value : b.value - a.value));

  const total = rows.reduce((s, r) => s + r.value, 0);
  res.json({
    source: source.label,
    dimension: dim.label,
    metric: q.metric,
    metricLabel: q.metric === 'sum' ? `Sum of ${source.sumField}` : 'Count',
    rows,
    total,
  });
}));

export default router;
