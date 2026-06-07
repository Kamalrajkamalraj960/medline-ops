import type { Request } from 'express';
import { prisma, type NotificationChannel } from '@medline/db';
import { audit } from '../../lib/audit.js';
import { sendEmail, sendSms, sendWhatsApp } from '../../lib/messaging.js';
import type { TriggerKey } from './automation.constants.js';

/** Flat event payload passed to the engine. */
export type AutomationContext = Record<string, unknown> & {
  actorId?: string | null;
  ownerId?: string | null;
};

interface Condition { field: string; op: string; value: unknown }
interface Action { type: string; params?: Record<string, unknown> }
interface RuleDefinition { conditions?: Condition[]; actions?: Action[] }

function evalCondition(c: Condition, ctx: AutomationContext): boolean {
  const actual = ctx[c.field];
  const expected = c.value;
  switch (c.op) {
    case 'eq': return String(actual) === String(expected);
    case 'neq': return String(actual) !== String(expected);
    case 'contains': return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
    case 'gt': return Number(actual) > Number(expected);
    case 'lt': return Number(actual) < Number(expected);
    default: return false;
  }
}

/** Resolves an action's recipient target to concrete user ids. */
async function resolveRecipients(to: unknown, ctx: AutomationContext): Promise<string[]> {
  if (typeof to === 'string') {
    if (to === 'lead_owner') return ctx.ownerId ? [String(ctx.ownerId)] : [];
    if (to === 'actor') return ctx.actorId ? [String(ctx.actorId)] : [];
    if (to === 'managers') {
      const mgrs = await prisma.user.findMany({
        where: { status: 'ACTIVE', role: { name: { in: ['SALES_MANAGER', 'OPERATIONS_MANAGER'] } } },
        select: { id: true },
      });
      return mgrs.map((m) => m.id);
    }
    // Treat as an explicit user id.
    return [to];
  }
  return [];
}

const CHANNEL_BY_ACTION: Record<string, NotificationChannel> = {
  SEND_NOTIFICATION: 'IN_APP',
  SEND_EMAIL: 'EMAIL',
  SEND_WHATSAPP: 'WHATSAPP',
  SEND_SMS: 'SMS',
};

async function runAction(action: Action, ctx: AutomationContext, trigger: string): Promise<string> {
  const p = action.params ?? {};
  switch (action.type) {
    case 'CREATE_TASK': {
      const recipients = await resolveRecipients(p.assignTo, ctx);
      await prisma.task.create({
        data: {
          title: String(p.title ?? `Automation: ${trigger}`),
          description: p.body ? String(p.body) : null,
          status: 'NEW',
          priority: (['URGENT', 'HIGH', 'MEDIUM', 'LOW'].includes(String(p.priority)) ? String(p.priority) : 'MEDIUM') as never,
          department: p.department ? (String(p.department) as never) : null,
          assigneeId: recipients[0] ?? (ctx.ownerId ? String(ctx.ownerId) : null),
        },
      });
      return 'task created';
    }
    case 'SEND_NOTIFICATION':
    case 'SEND_EMAIL':
    case 'SEND_WHATSAPP':
    case 'SEND_SMS': {
      const recipients = await resolveRecipients(p.to ?? 'lead_owner', ctx);
      if (recipients.length === 0) return 'no recipients';
      const channel = CHANNEL_BY_ACTION[action.type];
      const title = String(p.title ?? trigger.replaceAll('_', ' '));
      const body = p.body ? String(p.body) : title;

      // Always record an in-app row (audit trail + the bell/inbox).
      await prisma.notification.createMany({
        data: recipients.map((userId) => ({ userId, channel, event: trigger, title, body: p.body ? String(p.body) : null })),
      });

      if (channel === 'IN_APP') return `SEND_NOTIFICATION → ${recipients.length} in-app`;

      // For external channels, dispatch through the provider using each
      // recipient's contact details.
      const users = await prisma.user.findMany({ where: { id: { in: recipients } }, select: { email: true, phone: true } });
      let delivered = 0;
      for (const u of users) {
        const result =
          channel === 'EMAIL' ? await sendEmail(u.email, title, body)
          : channel === 'SMS' ? await sendSms(u.phone, body)
          : await sendWhatsApp(u.phone, body);
        if (result.delivered) delivered += 1;
      }
      return `${action.type} → ${delivered}/${users.length} delivered`;
    }
    case 'NOTIFY_MANAGER': {
      const recipients = await resolveRecipients('managers', ctx);
      await prisma.notification.createMany({
        data: recipients.map((userId) => ({
          userId, channel: 'IN_APP' as NotificationChannel, event: trigger,
          title: String(p.title ?? `Manager alert: ${trigger}`), body: p.body ? String(p.body) : null,
        })),
      });
      return `notified ${recipients.length} manager(s)`;
    }
    case 'ESCALATE_CASE': {
      const ops = await prisma.user.findMany({
        where: { status: 'ACTIVE', role: { name: 'OPERATIONS_MANAGER' } }, select: { id: true },
      });
      await prisma.task.create({
        data: {
          title: String(p.title ?? `Escalation: ${trigger}`),
          status: 'NEW', priority: 'URGENT', department: 'OPERATIONS',
          assigneeId: ops[0]?.id ?? null,
        },
      });
      return 'case escalated';
    }
    default:
      return `unknown action ${action.type}`;
  }
}

/**
 * Fire-and-forget automation dispatch. Loads active rules for the trigger,
 * evaluates conditions, runs actions, and records an audit entry. Never throws
 * into the calling request path.
 */
export async function dispatch(trigger: TriggerKey, ctx: AutomationContext, req?: Request): Promise<void> {
  try {
    const rules = await prisma.automationRule.findMany({ where: { trigger, isActive: true } });
    if (rules.length === 0) return;

    for (const rule of rules) {
      const def = (rule.definition ?? {}) as RuleDefinition;
      const conditions = def.conditions ?? [];
      const passes = conditions.every((c) => evalCondition(c, ctx));
      if (!passes) continue;

      const results: string[] = [];
      for (const action of def.actions ?? []) {
        try {
          results.push(await runAction(action, ctx, trigger));
        } catch (err) {
          results.push(`error: ${(err as Error).message}`);
        }
      }

      await audit({
        action: 'AUTOMATION_TRIGGERED',
        resource: 'automation',
        resourceId: rule.id,
        newValue: { trigger, rule: rule.name, results },
        req,
      });
    }
  } catch (err) {
    console.error('[automation] dispatch failed', err);
  }
}
