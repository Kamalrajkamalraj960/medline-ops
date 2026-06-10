export type RoleName =
  | 'SUPER_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'SALES_MANAGER'
  | 'SALES_EXECUTIVE'
  | 'DOCUMENTATION_TEAM'
  | 'ACADEMY_HEAD'
  | 'ACCOUNTS'
  | 'MARKETING'
  | 'CLIENT';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  role: RoleName;
  roleLabel: string;
  department: string | null;
  departmentLabel: string | null;
  permissions: string[];
}

export type ServiceType = 'consultancy' | 'academy';

export interface Lead {
  id: string;
  reference: string;
  name: string;
  phone: string;
  email: string | null;
  profession?: string | null;
  serviceType: ServiceType;
  status: string;
  priority: string;
  createdAt: string;
  owner?: { id: string; name: string } | null;
  source?: { name: string } | null;
}

export interface ConsultancyCaseRow {
  id: string;
  reference: string;
  authority: string;
  profession: string | null;
  status: string;
  priority: string;
  progressPct: number;
  createdAt: string;
  lead: { name: string; phone: string; serviceType: ServiceType };
  authorityTracking: { status: string; referenceNumber: string | null } | null;
}

export interface CaseDocument {
  id: string;
  category: string;
  fileUrl: string | null;
  status: string;
  rejectionReason: string | null;
  versions: { id: string; version: number; fileUrl: string }[];
}

export interface FollowUp {
  id: string;
  type: string;
  dueAt: string | null;
  completedAt: string | null;
  notes: string | null;
}

export interface ConsultancyCaseDetail {
  id: string;
  reference: string;
  authority: string;
  profession: string | null;
  status: string;
  priority: string;
  progressPct: number;
  openedAt: string;
  closedAt: string | null;
  lead: { id: string; name: string; phone: string; email: string | null; profession: string | null; serviceType: ServiceType };
  documents: CaseDocument[];
  authorityTracking:
    | { id: string; status: string; referenceNumber: string | null; submissionDate: string | null; followUps: FollowUp[] }
    | null;
}

export interface CaseStage {
  status: string;
  label: string;
  progress: number;
}

// ---- Academy ----
export interface Course {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  profession: string | null;
  level: string | null;
  durationWeeks: number | null;
  price: number | string | null;
  thumbnailUrl: string | null;
  learningObjectives: string[] | null;
  syllabus: string | null;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  _count: { batches: number; students: number };
}

export interface AcademyStats {
  totalStudents: number;
  activeStudents: number;
  activeBatches: number;
  upcomingBatches: number;
  totalBatches: number;
  courses: number;
  activeCourses: number;
  totalCourses: number;
  faculty: number;
  demos: number;
  monthlyEnrollments: number;
}

export interface Faculty {
  id: string;
  name: string;
  specialization: string | null;
  experienceYears: number | null;
  rating: number | null;
  _count: { batches: number };
}

export interface Batch {
  id: string;
  code: string;
  status: string;
  timing: string | null;
  seatLimit: number;
  startDate: string | null;
  endDate: string | null;
  course: { name: string } | null;
  faculty: { name: string } | null;
  _count: { students: number };
}

export interface Student {
  id: string;
  reference: string;
  name: string;
  status: string;
  progressPct: number;
  attendancePct: number;
  certificateIssuedAt: string | null;
  course: { name: string } | null;
  batch: { code: string } | null;
}

export interface Demo {
  id: string;
  leadName: string;
  scheduledAt: string | null;
  outcome: string | null;
  likelihood: number | null;
  recommendedCourse: string | null;
}

// ---- Accounts ----
export interface Invoice {
  id: string;
  number: string;
  clientName: string;
  amount: string;
  gstAmount: string;
  status: string;
  issuedAt: string | null;
  dueAt: string | null;
  _count?: { payments: number };
}

export interface PaymentHistoryEntry {
  action: string;
  status?: string;
  at: string;
  byId?: string;
  byName?: string;
  note?: string;
}

export interface Payment {
  id: string;
  reference: string;
  payerName: string;
  payerId?: string | null;
  amount: number | string;
  method: string;
  type: string;
  status: string;
  transactionRef?: string | null;
  installmentNumber?: number | null;
  notes?: string | null;
  proofUrl?: string | null;
  paymentDate: string | null;
  paidAt: string | null;
  verifiedAt?: string | null;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  leadId?: string | null;
  studentId?: string | null;
  courseId?: string | null;
  history?: PaymentHistoryEntry[];
  createdAt: string;
  invoice?: { number: string; clientName?: string } | null;
  lead?: { name: string; reference: string } | null;
  student?: { name: string; reference: string } | null;
  course?: { name: string } | null;
}

export interface PaymentStats {
  totalPayments: number;
  totalRevenue: number;
  confirmedPayments: number;
  confirmedAmount: number;
  pendingVerificationCount: number;
  pendingVerificationAmount: number;
}

export interface Refund {
  id: string;
  clientName: string;
  amount: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

export interface GstSummary {
  taxableTurnover: number;
  gstCollected: number;
  gstPending: number;
  taxLiability: number;
}

// ---- Marketing ----
export interface LeadSourceRow {
  id: string;
  name: string;
  channel: string | null;
  isActive: boolean;
  leads: number;
  campaigns: number;
  conversions: number;
  conversionRate: number;
}

export interface CampaignRow {
  id: string;
  name: string;
  type: string;
  status: string;
  serviceType: ServiceType | null;
  source: { name: string } | null;
  budget: number;
  spend: number;
  leads: number;
  conversions: number;
  costPerLead: number;
  conversionRate: number;
}

export interface MarketingStats {
  leadsThisMonth: number;
  costPerLead: number;
  conversionRate: number;
  bestSource: string;
  activeCampaigns: number;
  totalSpend: number;
}

// ---- Client portal ----
export interface PortalOverview {
  profile: { name: string; serviceType: ServiceType };
  executive: { name: string; email: string; phone: string | null; avatarUrl: string | null } | null;
  application: {
    type: ServiceType;
    reference: string;
    authority: string | null;
    course: string | null;
    batch: string | null;
    stage: string;
    progressPct: number;
    authorityStatus: string | null;
    authorityReference: string | null;
  };
  journey: { step: number; label: string; state: 'done' | 'current' | 'upcoming' }[];
  documents: { verified: number; pending: number; total: number };
  payment: { totalFee: number; totalPaid: number; balance: number };
}

export interface PortalDocument {
  id: string;
  category: string;
  status: string;
  rejectionReason: string | null;
  fileUrl: string | null;
}

export interface PortalInvoice {
  id: string;
  number: string;
  amount: string;
  gstAmount: string;
  status: string;
  issuedAt: string | null;
  dueAt: string | null;
  payments: { reference: string; amount: string; method: string; status: string; paidAt: string | null }[];
}

// ---- Automation ----
export interface AutomationCondition { field: string; op: string; value: string | number | boolean }
export interface AutomationAction { type: string; params?: Record<string, string> }
export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  definition: { conditions?: AutomationCondition[]; actions?: AutomationAction[] };
  createdAt: string;
}
export interface AutomationMeta {
  triggers: { key: string; label: string; fields: string[] }[];
  actions: { type: string; label: string; params: string[] }[];
  recipientTargets: string[];
}

// ---- Notifications ----
export interface AppNotification {
  id: string;
  channel: string;
  event: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

// ---- Admin ----
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  status: string;
  lastLoginAt: string | null;
  role: { name: string; label: string };
  department: { name: string; label: string } | null;
}

export interface RoleOption { id: string; name: string; label: string }
export interface DeptOption { id: string; name: string; label: string }

export interface RoleWithPermissions {
  id: string;
  name: string;
  label: string;
  description: string | null;
  userCount: number;
  permissions: string[];
}

export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  reason: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { name: string; email: string } | null;
}

// ---- Tasks ----
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  department: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  assignee: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
}

export interface AssignableUser {
  id: string;
  name: string;
  role: { name: string; label: string };
}

// ---- Reports ----
export interface ReportSourceMeta {
  key: string;
  label: string;
  dimensions: { field: string; label: string }[];
  hasSum: boolean;
  sumLabel: string | null;
}

export interface ReportResult {
  source: string;
  dimension: string;
  metric: string;
  metricLabel: string;
  rows: { label: string; value: number }[];
  total: number;
}

// ---- Creative library ----
export interface CreativeAsset {
  id: string;
  name: string;
  type: string;
  category: string | null;
  url: string | null;
  tags: string[];
  status: string;
  createdAt: string;
}

// ---- Authority payments ----
export interface AuthorityPayment {
  id: string;
  clientName: string;
  authority: string;
  type: string;
  amount: string;
  paidAt: string | null;
  recovered: boolean;
  status: string;
  createdAt: string;
}

// ---- Account closures (derived) ----
export interface Closure {
  client: string;
  invoiced: number;
  paid: number;
  balance: number;
  invoiceCount: number;
  status: string;
}
