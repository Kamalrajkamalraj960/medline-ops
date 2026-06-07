'use client';

import { useAuthStore } from '@/lib/auth-store';
import { PageHeader } from '@/components/ui';
import { ExecutiveDashboard } from '@/components/dashboards/executive-dashboard';
import { SalesDashboard } from '@/components/dashboards/sales-dashboard';
import { DocumentationDashboard } from '@/components/dashboards/documentation-dashboard';
import { AcademyDashboard } from '@/components/dashboards/academy-dashboard';
import { AccountsDashboard } from '@/components/dashboards/accounts-dashboard';
import { MarketingDashboard } from '@/components/dashboards/marketing-dashboard';
import type { RoleName } from '@/lib/types';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const SUBTITLE: Partial<Record<RoleName, string>> = {
  SUPER_ADMIN: 'Executive command center',
  OPERATIONS_MANAGER: 'Cross-department operations snapshot',
  SALES_MANAGER: 'Sales command center',
  SALES_EXECUTIVE: 'Your pipeline at a glance',
  DOCUMENTATION_TEAM: 'Documentation desk — queue & authority tracking',
  ACADEMY_HEAD: 'Academy learning overview',
  ACCOUNTS: 'Accounts & finance',
  MARKETING: 'Campaign performance & analytics',
};

function DashboardForRole({ role }: { role: RoleName }) {
  switch (role) {
    case 'SALES_MANAGER':
    case 'SALES_EXECUTIVE':
      return <SalesDashboard />;
    case 'DOCUMENTATION_TEAM':
      return <DocumentationDashboard />;
    case 'ACADEMY_HEAD':
      return <AcademyDashboard />;
    case 'ACCOUNTS':
      return <AccountsDashboard />;
    case 'MARKETING':
      return <MarketingDashboard />;
    case 'SUPER_ADMIN':
    case 'OPERATIONS_MANAGER':
    default:
      return <ExecutiveDashboard />;
  }
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]} 👋`}
        subtitle={SUBTITLE[user.role] ?? user.roleLabel}
      />
      <DashboardForRole role={user.role} />
    </div>
  );
}
