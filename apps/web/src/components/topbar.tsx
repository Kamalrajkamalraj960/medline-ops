'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { NotificationBell } from './notification-bell';

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clear = useAuthStore((s) => s.clear);

  async function logout() {
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } catch {
      /* ignore */
    }
    clear();
    router.replace('/login');
  }

  const initials = user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') ?? '?';

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:px-6">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="ml-2 hidden rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-sm dark:bg-slate-900 sm:inline">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="text-right">
          <p className="text-sm font-semibold leading-none text-slate-900 dark:text-white">{user?.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">{user?.roleLabel}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
          {initials}
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
