import type { Request } from 'express';
import { prisma } from '@medline/db';

interface AuditInput {
  actorId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  req?: Request;
}

/**
 * Append-only audit trail. Never throws into the request path — a failed
 * audit write is logged but does not break the user's action.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? input.req?.user?.id ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        oldValue: (input.oldValue ?? undefined) as never,
        newValue: (input.newValue ?? undefined) as never,
        reason: input.reason ?? null,
        ipAddress: input.req?.ip ?? null,
        userAgent: input.req?.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    console.error('[audit] failed to write audit log', err);
  }
}
