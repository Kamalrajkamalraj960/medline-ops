import type { RoleName } from '@/lib/types';

export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide-react icon name
}

const DASHBOARD: NavItem = { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' };

/**
 * Per-role sidebar. Mirrors the module breakdown from the spec.
 * Routes that aren't built yet still render (they show an "in progress" page),
 * so the full IA is navigable from day one.
 */
export const NAV_BY_ROLE: Record<RoleName, NavItem[]> = {
  SUPER_ADMIN: [
    DASHBOARD,
    { label: 'CRM', href: '/crm', icon: 'Contact' },
    { label: 'Consultancy', href: '/consultancy', icon: 'FileCheck' },
    { label: 'Authority Tracking', href: '/authorities', icon: 'Landmark' },
    { label: 'Academy', href: '/academy', icon: 'GraduationCap' },
    { label: 'Documents', href: '/documents', icon: 'FolderOpen' },
    { label: 'Accounts', href: '/accounts', icon: 'Wallet' },
    { label: 'Campaigns', href: '/campaigns', icon: 'Megaphone' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
    { label: 'Users', href: '/users', icon: 'UserCog' },
    { label: 'Roles & Permissions', href: '/roles', icon: 'ShieldCheck' },
    { label: 'Automation', href: '/automation', icon: 'Workflow' },
    { label: 'Audit Logs', href: '/audit', icon: 'ScrollText' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
  OPERATIONS_MANAGER: [
    DASHBOARD,
    { label: 'CRM Overview', href: '/crm', icon: 'Contact' },
    { label: 'Departments', href: '/departments', icon: 'Building2' },
    { label: 'Tasks', href: '/tasks', icon: 'ListChecks' },
    { label: 'Team Performance', href: '/performance', icon: 'TrendingUp' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
  ],
  SALES_MANAGER: [
    DASHBOARD,
    { label: 'Team Leads', href: '/leads', icon: 'Users' },
    { label: 'Lead Assignment', href: '/assignments', icon: 'UserPlus' },
    { label: 'Team Performance', href: '/performance', icon: 'TrendingUp' },
    { label: 'Targets', href: '/targets', icon: 'Target' },
    { label: 'Approvals', href: '/approvals', icon: 'CheckCircle2' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
  ],
  SALES_EXECUTIVE: [
    DASHBOARD,
    { label: 'My Leads', href: '/leads', icon: 'Users' },
    { label: 'My Clients', href: '/clients', icon: 'Contact' },
    { label: 'Tasks', href: '/tasks', icon: 'ListChecks' },
    { label: 'Follow Ups', href: '/follow-ups', icon: 'PhoneCall' },
    { label: 'Documents', href: '/documents', icon: 'FolderOpen' },
    { label: 'Notifications', href: '/notifications', icon: 'Bell' },
  ],
  DOCUMENTATION_TEAM: [
    DASHBOARD,
    { label: 'Submission Queue', href: '/queue', icon: 'Inbox' },
    { label: 'Authority Tracking', href: '/authorities', icon: 'Landmark' },
    { label: 'All Cases', href: '/consultancy', icon: 'FileCheck' },
    { label: 'Completed', href: '/completed', icon: 'CheckCircle2' },
    { label: 'Archives', href: '/archives', icon: 'Archive' },
  ],
  ACADEMY_HEAD: [
    DASHBOARD,
    { label: 'Pipeline', href: '/pipeline', icon: 'GitBranch' },
    { label: 'Courses', href: '/courses', icon: 'BookOpen' },
    { label: 'Batches', href: '/batches', icon: 'CalendarDays' },
    { label: 'Students', href: '/students', icon: 'GraduationCap' },
    { label: 'Demos', href: '/demos', icon: 'PlayCircle' },
    { label: 'Faculty', href: '/faculty', icon: 'Users' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
  ],
  ACCOUNTS: [
    DASHBOARD,
    { label: 'Payments', href: '/payments', icon: 'CreditCard' },
    { label: 'Invoices', href: '/invoices', icon: 'FileText' },
    { label: 'GST', href: '/gst', icon: 'Percent' },
    { label: 'Authority Payments', href: '/authority-payments', icon: 'Landmark' },
    { label: 'Refunds', href: '/refunds', icon: 'Undo2' },
    { label: 'Closures', href: '/closures', icon: 'FileX' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
  ],
  MARKETING: [
    DASHBOARD,
    { label: 'Lead Sources', href: '/lead-sources', icon: 'Radar' },
    { label: 'Campaigns', href: '/campaigns', icon: 'Megaphone' },
    { label: 'Creative Library', href: '/creatives', icon: 'Image' },
    { label: 'Analytics', href: '/analytics', icon: 'LineChart' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
  ],
  CLIENT: [
    { label: 'Home', href: '/portal', icon: 'Home' },
    { label: 'My Application', href: '/portal/application', icon: 'FileCheck' },
    { label: 'Documents', href: '/portal/documents', icon: 'FolderOpen' },
    { label: 'Payments', href: '/portal/payments', icon: 'CreditCard' },
    { label: 'Support', href: '/portal/support', icon: 'LifeBuoy' },
  ],
};

/** Where each role should land after login. */
export function homePathForRole(role: RoleName): string {
  return role === 'CLIENT' ? '/portal' : '/dashboard';
}
