'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import type { AppNotification } from '@/lib/types';

const channelDot: Record<string, string> = {
  IN_APP: 'bg-brand-500',
  EMAIL: 'bg-violet-500',
  WHATSAPP: 'bg-emerald-500',
  SMS: 'bg-amber-500',
  PUSH: 'bg-rose-500',
};

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => (await api.get<{ items: AppNotification[]; unreadCount: number }>('/notifications', { params: { limit: 8 } })).data,
    refetchInterval: 30_000, // light polling keeps the badge fresh
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: async () => (await api.post('/notifications/read-all')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = data?.unreadCount ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
            {unread > 0 && (
              <button onClick={() => markAll.mutate()} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!data || data.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">You’re all caught up.</p>
            ) : (
              data.items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.readAt && markRead.mutate(n.id)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/50',
                    !n.readAt && 'bg-brand-50/40 dark:bg-brand-600/5',
                  )}
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', channelDot[n.channel] ?? 'bg-slate-400')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                    {n.body && <p className="truncate text-xs text-slate-500">{n.body}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.createdAt)} · {n.channel.replaceAll('_', ' ')}</p>
                  </div>
                  {!n.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </button>
              ))
            )}
          </div>

          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-brand-600 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
