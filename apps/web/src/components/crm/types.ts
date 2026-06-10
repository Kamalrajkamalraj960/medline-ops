/**
 * CRM — Leads Management domain types.
 *
 * This module is intentionally self-contained and driven by local mock data
 * (see `mock-leads.ts`). It mirrors the platform's real Lead concept but uses
 * a presentation-oriented shape (stage/priority as display strings) so the UI
 * can be built and reviewed independently of the backend wiring.
 */

// Stages mirror the backend Lead lifecycle (LeadStatus), shown as friendly labels.
export const LEAD_STAGES = [
  'New',
  'Contacted',
  'Interested',
  'Demo Scheduled',
  'Demo Completed',
  'Documentation',
  'Converted',
  'Lost',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;

export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

// The ONLY two service types — "Both" is intentionally absent (core business rule).
export const LEAD_SERVICES = ['Consultancy', 'Academy'] as const;

export type LeadService = (typeof LEAD_SERVICES)[number];

/** Maps backend enums ↔ the display values used across the CRM table. */
export const STATUS_TO_STAGE: Record<string, LeadStage> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  DEMO_SCHEDULED: 'Demo Scheduled',
  DEMO_COMPLETED: 'Demo Completed',
  DOCUMENTATION: 'Documentation',
  CONVERTED: 'Converted',
  LOST: 'Lost',
};

export const PRIORITY_TO_LABEL: Record<string, LeadPriority> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export interface Lead {
  id: string;
  leadId: string;
  name: string;
  phone: string;
  profession: string;
  service: LeadService;
  stage: LeadStage;
  assignedTo: string;
  createdAt: string; // ISO date string
  priority: LeadPriority;
}

/** Columns that the table can be sorted by. */
export type SortableField = 'leadId' | 'name' | 'stage' | 'assignedTo' | 'createdAt' | 'priority';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortableField;
  direction: SortDirection;
}

export interface LeadFilterState {
  search: string;
  stage: LeadStage | 'all';
  priority: LeadPriority | 'all';
  service: LeadService | 'all';
}

export type ViewMode = 'table' | 'card';

export const EMPTY_FILTERS: LeadFilterState = {
  search: '',
  stage: 'all',
  priority: 'all',
  service: 'all',
};
