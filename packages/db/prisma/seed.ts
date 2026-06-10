import bcrypt from 'bcryptjs';
// The shared client handles env loading (DATABASE_URL/DIRECT_URL) on import.
import { prisma, type RoleName, type DepartmentName } from '../src/index.js';

// ---------------------------------------------------------------------------
// Permission catalogue. Keys are "<resource>:<action>".
// ---------------------------------------------------------------------------
const RESOURCES = [
  'dashboard', 'lead', 'client', 'student', 'case', 'document', 'authority',
  'course', 'batch', 'faculty', 'demo', 'payment', 'invoice', 'gst', 'refund',
  'campaign', 'lead_source', 'report', 'analytics', 'task', 'user', 'role',
  'automation', 'notification', 'audit', 'settings',
];
const ACTIONS = [
  'view', 'create', 'edit', 'delete', 'assign', 'approve', 'export', 'import',
  'manage', 'administer',
];

function key(resource: string, action: string) {
  return `${resource}:${action}`;
}

// Role -> list of permission keys. SUPER_ADMIN is handled as "all".
const VIEW_ALL = RESOURCES.map((r) => key(r, 'view'));

const ROLE_PERMISSIONS: Record<Exclude<RoleName, 'SUPER_ADMIN'>, string[]> = {
  OPERATIONS_MANAGER: [
    ...VIEW_ALL,
    key('lead', 'create'), key('lead', 'edit'), key('lead', 'assign'),
    key('task', 'create'), key('task', 'edit'), key('task', 'assign'),
    key('report', 'export'), key('analytics', 'view'),
  ],
  SALES_MANAGER: [
    key('dashboard', 'view'), key('lead', 'view'), key('lead', 'create'),
    key('lead', 'edit'), key('lead', 'assign'), key('lead', 'approve'),
    key('lead', 'export'), key('lead', 'import'),
    key('client', 'view'), key('task', 'view'), key('task', 'assign'),
    key('report', 'view'), key('report', 'export'), key('analytics', 'view'),
  ],
  SALES_EXECUTIVE: [
    key('dashboard', 'view'), key('lead', 'view'), key('lead', 'create'),
    key('lead', 'edit'), key('client', 'view'), key('client', 'edit'),
    key('task', 'view'), key('task', 'edit'), key('document', 'view'),
    key('notification', 'view'),
  ],
  DOCUMENTATION_TEAM: [
    key('dashboard', 'view'), key('case', 'view'), key('case', 'create'),
    key('case', 'edit'), key('document', 'view'), key('document', 'create'),
    key('document', 'edit'), key('document', 'approve'),
    key('authority', 'view'), key('authority', 'edit'),
    key('report', 'view'), key('task', 'view'),
  ],
  ACADEMY_HEAD: [
    key('dashboard', 'view'), key('student', 'view'), key('student', 'create'),
    key('student', 'edit'), key('course', 'view'), key('course', 'create'),
    key('course', 'edit'), key('batch', 'view'), key('batch', 'create'),
    key('batch', 'edit'), key('faculty', 'view'), key('faculty', 'manage'),
    key('demo', 'view'), key('demo', 'create'), key('lead', 'view'),
    key('report', 'view'), key('report', 'export'), key('analytics', 'view'),
  ],
  ACCOUNTS: [
    key('dashboard', 'view'), key('payment', 'view'), key('payment', 'create'),
    key('payment', 'edit'), key('invoice', 'view'), key('invoice', 'create'),
    key('invoice', 'edit'), key('gst', 'view'), key('refund', 'view'),
    key('refund', 'approve'), key('report', 'view'), key('report', 'export'),
    key('analytics', 'view'),
  ],
  MARKETING: [
    key('dashboard', 'view'), key('campaign', 'view'), key('campaign', 'create'),
    key('campaign', 'edit'), key('lead_source', 'view'), key('lead_source', 'manage'),
    key('lead', 'view'), key('lead', 'create'), key('analytics', 'view'),
    key('report', 'view'), key('report', 'export'),
  ],
  CLIENT: [
    key('dashboard', 'view'), key('case', 'view'), key('document', 'view'),
    key('document', 'create'), key('payment', 'view'), key('invoice', 'view'),
    key('notification', 'view'),
  ],
};

const DEPARTMENTS: { name: DepartmentName; label: string }[] = [
  { name: 'ADMINISTRATION', label: 'Administration' },
  { name: 'OPERATIONS', label: 'Operations' },
  { name: 'SALES', label: 'Sales' },
  { name: 'DOCUMENTATION', label: 'Documentation' },
  { name: 'ACADEMY', label: 'Academy' },
  { name: 'ACCOUNTS', label: 'Accounts' },
  { name: 'MARKETING', label: 'Marketing' },
];

const ROLES: { name: RoleName; label: string; description: string }[] = [
  { name: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full control of the organization.' },
  { name: 'OPERATIONS_MANAGER', label: 'Operations Manager', description: 'Cross-department operations oversight.' },
  { name: 'SALES_MANAGER', label: 'Sales Manager', description: 'Manages the sales team and lead distribution.' },
  { name: 'SALES_EXECUTIVE', label: 'Sales Executive', description: 'Works leads and conversions directly.' },
  { name: 'DOCUMENTATION_TEAM', label: 'Documentation Team', description: 'Consultancy cases and authority submissions.' },
  { name: 'ACADEMY_HEAD', label: 'Academy Head', description: 'Academy operations, students and batches.' },
  { name: 'ACCOUNTS', label: 'Accounts', description: 'Finance, invoices, GST and refunds.' },
  { name: 'MARKETING', label: 'Marketing', description: 'Campaigns, lead sources and ROI.' },
  { name: 'CLIENT', label: 'Client / Student', description: 'Self-service portal.' },
];

const USERS: {
  name: string; email: string; username: string; password: string;
  role: RoleName; department?: DepartmentName;
}[] = [
  { name: 'Mohammed Jaseer P', email: 'super_admin@medline.com', username: 'jaseer', password: '1001', role: 'SUPER_ADMIN', department: 'ADMINISTRATION' },
  { name: 'Rishad', email: 'operations_manager@medline.com', username: 'rishad', password: '2001', role: 'OPERATIONS_MANAGER', department: 'OPERATIONS' },
  { name: 'Sabeena', email: 'sales_manager@medline.com', username: 'sabeena', password: '3001', role: 'SALES_MANAGER', department: 'SALES' },
  { name: 'Safa', email: 'sales_executive@medline.com', username: 'safa', password: '4001', role: 'SALES_EXECUTIVE', department: 'SALES' },
  { name: 'Jayakrishnan', email: 'accounts@medline.com', username: 'jayakrishnan', password: '5001', role: 'ACCOUNTS', department: 'ACCOUNTS' },
  { name: 'Hiba', email: 'academy_head@medline.com', username: 'hiba', password: '6001', role: 'ACADEMY_HEAD', department: 'ACADEMY' },
  { name: 'Sabhareesh', email: 'marketing@medline.com', username: 'sabhareesh', password: '7001', role: 'MARKETING', department: 'MARKETING' },
  { name: 'Dineesh PP', email: 'documentation_team@medline.com', username: 'dineesh', password: '8001', role: 'DOCUMENTATION_TEAM', department: 'DOCUMENTATION' },
  { name: 'Demo Client', email: 'client@medline.com', username: 'client', password: '9999', role: 'CLIENT' },
];

async function main() {
  console.log('🌱 Seeding Medline Ops...');

  // Permissions
  const allKeys = RESOURCES.flatMap((r) => ACTIONS.map((a) => ({ resource: r, action: a })));
  for (const { resource, action } of allKeys) {
    await prisma.permission.upsert({
      where: { key: key(resource, action) },
      update: {},
      create: { key: key(resource, action), resource, action },
    });
  }
  console.log(`  ✔ ${allKeys.length} permissions`);

  // Departments
  for (const d of DEPARTMENTS) {
    await prisma.department.upsert({ where: { name: d.name }, update: { label: d.label }, create: d });
  }
  console.log(`  ✔ ${DEPARTMENTS.length} departments`);

  // Roles
  for (const r of ROLES) {
    await prisma.role.upsert({ where: { name: r.name }, update: { label: r.label, description: r.description }, create: r });
  }
  console.log(`  ✔ ${ROLES.length} roles`);

  // Role -> permission grants
  const permissions = await prisma.permission.findMany();
  const permByKey = new Map(permissions.map((p) => [p.key, p.id]));

  for (const role of ROLES) {
    const dbRole = await prisma.role.findUniqueOrThrow({ where: { name: role.name } });
    const grantKeys =
      role.name === 'SUPER_ADMIN'
        ? permissions.map((p) => p.key)
        : ROLE_PERMISSIONS[role.name as Exclude<RoleName, 'SUPER_ADMIN'>] ?? [];

    for (const k of grantKeys) {
      const permId = permByKey.get(k);
      if (!permId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: dbRole.id, permissionId: permId } },
        update: {},
        create: { roleId: dbRole.id, permissionId: permId },
      });
    }
  }
  console.log('  ✔ role permissions granted');

  // Users
  for (const u of USERS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: u.role } });
    const department = u.department
      ? await prisma.department.findUniqueOrThrow({ where: { name: u.department } })
      : null;
    const passwordHash = await bcrypt.hash(u.password, 10);

    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, username: u.username, roleId: role.id, departmentId: department?.id },
      create: {
        name: u.name,
        email: u.email,
        username: u.username,
        passwordHash,
        roleId: role.id,
        departmentId: department?.id,
      },
    });
  }
  console.log(`  ✔ ${USERS.length} users`);

  // A handful of lead sources for the CRM dropdowns.
  const sources = ['Facebook Ads', 'Instagram Ads', 'Google Ads', 'YouTube Ads', 'LinkedIn', 'Website', 'Organic Search', 'WhatsApp Campaigns', 'Referral', 'Events', 'Email Marketing', 'Direct Inquiry'];
  for (const name of sources) {
    await prisma.leadSource.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`  ✔ ${sources.length} lead sources`);

  // -------------------------------------------------------------------------
  // Demo client journey — gives the CLIENT portal real data to render.
  // Idempotent via unique reference/number keys.
  // -------------------------------------------------------------------------
  const safa = await prisma.user.findUnique({ where: { email: 'sales_executive@medline.com' } });
  const demoLead = await prisma.lead.upsert({
    where: { reference: 'LD-2026-9001' },
    update: {},
    create: {
      reference: 'LD-2026-9001',
      name: 'Deepa Thomas',
      phone: '+971500000001',
      email: 'deepa.thomas@example.com',
      gender: 'Female',
      country: 'UAE',
      city: 'Dubai',
      profession: 'Staff Nurse',
      experienceYears: 5,
      serviceType: 'consultancy',
      status: 'CONVERTED',
      priority: 'HIGH',
      ownerId: safa?.id,
      convertedAt: new Date(),
    },
  });

  // Link the demo client portal user to this lead.
  await prisma.user.update({
    where: { email: 'client@medline.com' },
    data: { name: 'Deepa Thomas', portalLeadId: demoLead.id },
  });

  const demoCase = await prisma.consultancyCase.upsert({
    where: { reference: 'CC-2026-9001' },
    update: {},
    create: {
      reference: 'CC-2026-9001',
      leadId: demoLead.id,
      authority: 'DHA',
      profession: 'Staff Nurse',
      status: 'UNDER_REVIEW',
      priority: 'HIGH',
      progressPct: 55,
      assignedOfficerId: (await prisma.user.findUnique({ where: { email: 'documentation_team@medline.com' } }))?.id,
      authorityTracking: {
        create: { authority: 'DHA', status: 'UNDER_REVIEW', referenceNumber: 'DHA-2026-77421', submissionDate: new Date() },
      },
    },
  });

  // A few documents in varied states.
  const docs = [
    { category: 'Passport', status: 'VERIFIED' as const, fileUrl: 'https://example.com/passport.pdf' },
    { category: 'Degree Certificate', status: 'VERIFIED' as const, fileUrl: 'https://example.com/degree.pdf' },
    { category: 'Good Standing Certificate', status: 'UNDER_REVIEW' as const, fileUrl: 'https://example.com/gsc.pdf' },
    { category: 'Experience Certificate', status: 'MISSING' as const },
  ];
  const existingDocs = await prisma.document.count({ where: { caseId: demoCase.id } });
  if (existingDocs === 0) {
    for (const d of docs) {
      await prisma.document.create({
        data: {
          caseId: demoCase.id,
          category: d.category,
          status: d.status,
          fileUrl: d.fileUrl,
          versions: d.fileUrl ? { create: { version: 1, fileUrl: d.fileUrl } } : undefined,
        },
      });
    }
  }

  // An invoice with a partial payment.
  const demoInvoice = await prisma.invoice.upsert({
    where: { number: 'INV-2026-9001' },
    update: {},
    create: {
      number: 'INV-2026-9001',
      clientName: 'Deepa Thomas',
      leadId: demoLead.id,
      amount: 25000,
      gstAmount: 4500,
      status: 'PARTIALLY_PAID',
      issuedAt: new Date(),
    },
  });
  const existingPay = await prisma.payment.count({ where: { invoiceId: demoInvoice.id } });
  if (existingPay === 0) {
    await prisma.payment.create({
      data: { reference: 'PAY-2026-9001', payerName: 'Deepa Thomas', invoiceId: demoInvoice.id, amount: 15000, method: 'UPI', status: 'CONFIRMED', paidAt: new Date() },
    });
  }
  console.log('  ✔ demo client journey (Deepa Thomas → client@medline.com)');

  console.log('✅ Seed complete.\n');
  console.log('Login with any of:');
  USERS.forEach((u) => console.log(`   ${u.role.padEnd(20)} ${u.email}  /  ${u.password}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
