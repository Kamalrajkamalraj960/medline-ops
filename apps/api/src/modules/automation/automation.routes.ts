import { Router } from 'express';
import { prisma, type Prisma } from '@medline/db';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { ACTIONS, RECIPIENT_TARGETS, TRIGGERS } from './automation.constants.js';
import { createRuleSchema, updateRuleSchema } from './automation.schema.js';

const router = Router();

// Catalog for the rule builder UI.
router.get('/meta', authorize('automation:view', 'automation:manage'), (_req, res) => {
  res.json({ triggers: TRIGGERS, actions: ACTIONS, recipientTargets: RECIPIENT_TARGETS });
});

router.get('/', authorize('automation:view', 'automation:manage'), asyncHandler(async (_req, res) => {
  res.json(await prisma.automationRule.findMany({ orderBy: { createdAt: 'desc' } }));
}));

router.post('/', authorize('automation:manage'), validateBody(createRuleSchema), asyncHandler(async (req, res) => {
  const rule = await prisma.automationRule.create({
    data: {
      name: req.body.name,
      trigger: req.body.trigger,
      isActive: req.body.isActive,
      definition: req.body.definition as Prisma.InputJsonValue,
    },
  });
  await audit({ action: 'AUTOMATION_RULE_CREATED', resource: 'automation', resourceId: rule.id, newValue: rule, req });
  res.status(201).json(rule);
}));

router.patch('/:id', authorize('automation:manage'), validateBody(updateRuleSchema), asyncHandler(async (req, res) => {
  const data: Prisma.AutomationRuleUpdateInput = {};
  if (req.body.name !== undefined) data.name = req.body.name;
  if (req.body.isActive !== undefined) data.isActive = req.body.isActive;
  if (req.body.definition !== undefined) data.definition = req.body.definition as Prisma.InputJsonValue;
  const rule = await prisma.automationRule.update({ where: { id: req.params.id }, data });
  await audit({ action: 'AUTOMATION_RULE_UPDATED', resource: 'automation', resourceId: rule.id, newValue: req.body, req });
  res.json(rule);
}));

router.delete('/:id', authorize('automation:manage'), asyncHandler(async (req, res) => {
  await prisma.automationRule.delete({ where: { id: req.params.id } });
  await audit({ action: 'AUTOMATION_RULE_DELETED', resource: 'automation', resourceId: req.params.id, req });
  res.status(204).send();
}));

export default router;
