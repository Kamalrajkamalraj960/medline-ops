/** Events that can fire automation rules. */
export const TRIGGERS = [
  { key: 'LEAD_CREATED', label: 'Lead created', fields: ['serviceType', 'priority', 'status', 'name'] },
  { key: 'LEAD_ASSIGNED', label: 'Lead assigned', fields: ['serviceType', 'ownerId'] },
  { key: 'LEAD_CONVERTED', label: 'Lead converted', fields: ['serviceType'] },
  { key: 'PAYMENT_CONFIRMED', label: 'Payment confirmed', fields: ['amount', 'method'] },
  { key: 'DOCUMENT_VERIFIED', label: 'Document verified', fields: ['category'] },
  { key: 'DOCUMENT_REJECTED', label: 'Document rejected', fields: ['category'] },
  { key: 'CASE_STATUS_CHANGED', label: 'Case status changed', fields: ['status', 'authority'] },
  { key: 'STUDENT_ENROLLED', label: 'Student enrolled', fields: [] },
] as const;

export const TRIGGER_KEYS = TRIGGERS.map((t) => t.key);
export type TriggerKey = (typeof TRIGGERS)[number]['key'];

/** Actions an automation rule can perform. */
export const ACTIONS = [
  { type: 'CREATE_TASK', label: 'Create task', params: ['title', 'assignTo', 'department', 'priority'] },
  { type: 'SEND_NOTIFICATION', label: 'Send in-app notification', params: ['to', 'title', 'body'] },
  { type: 'SEND_EMAIL', label: 'Send email', params: ['to', 'title', 'body'] },
  { type: 'SEND_WHATSAPP', label: 'Send WhatsApp', params: ['to', 'body'] },
  { type: 'SEND_SMS', label: 'Send SMS', params: ['to', 'body'] },
  { type: 'NOTIFY_MANAGER', label: 'Notify manager', params: ['title', 'body'] },
  { type: 'ESCALATE_CASE', label: 'Escalate to operations', params: ['title'] },
] as const;

export const ACTION_TYPES = ACTIONS.map((a) => a.type);

/** Recipient targets resolvable from an event context. */
export const RECIPIENT_TARGETS = ['lead_owner', 'managers', 'actor'] as const;

export const CONDITION_OPS = ['eq', 'neq', 'contains', 'gt', 'lt'] as const;
