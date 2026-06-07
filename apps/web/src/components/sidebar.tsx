'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';
import { NAV_BY_ROLE } from '@/config/nav';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { Icon } from './icon';

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const items = NAV_BY_ROLE[user.role] ?? [];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 dark:border-slate-800 dark:bg-slate-900 lg:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Activity className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold leading-none text-slate-900 dark:text-white">Medline Ops</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{user.roleLabel}</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <p className="px-3 pt-3 text-[11px] text-slate-400">v0.1.0 · Foundation</p>
    </aside>
  );
}
