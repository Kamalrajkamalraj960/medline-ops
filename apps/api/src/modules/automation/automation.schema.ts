import { z } from 'zod';
import { ACTION_TYPES, CONDITION_OPS, TRIGGER_KEYS } from './automation.constants.js';

const conditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(CONDITION_OPS as unknown as [string, ...string[]]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const actionSchema = z.object({
  type: z.enum(ACTION_TYPES as unknown as [string, ...string[]]),
  params: z.record(z.any()).optional(),
});

export const createRuleSchema = z.object({
  name: z.string().min(2),
  trigger: z.enum(TRIGGER_KEYS as unknown as [string, ...string[]]),
  isActive: z.boolean().default(true),
  definition: z.object({
    conditions: z.array(conditionSchema).default([]),
    actions: z.array(actionSchema).min(1, 'At least one action is required'),
  }),
});

export const updateRuleSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  definition: z
    .object({
      conditions: z.array(conditionSchema).default([]),
      actions: z.array(actionSchema).min(1),
    })
    .optional(),
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
