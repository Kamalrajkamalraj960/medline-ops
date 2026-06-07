'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Inbox } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import { PageHeader } from '@/components/ui';
import type { AppNotification } from '@/lib/types';

const channelDot: Record<string, string> = {
  IN_APP: 'bg-brand-500', EMAIL: 'bg-violet-500', WHATSAPP: 'bg-emerald-500', SMS: 'bg-amber-500', PUSH: 'bg-rose-500',
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'page', unreadOnly],
    queryFn: async () => (await api.get<{ items: AppNotification[]; unreadCount: number }>('/notifications', { params: { limit: 50, unread: unreadOnly || undefined } })).data,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: async () => (await api.post('/notifications/read-all')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle={data ? `${data.unreadCount} unread` : 'Your alerts and updates'}
        action={
          (data?.unreadCount ?? 0) > 0 && (
            <button className="btn-primary" onClick={() => markAll.mutate()}><Check className="h-4 w-4" /> Mark all read</button>
          )
        }
      />

      <div className="mb-4 flex gap-2">
        <button onClick={() => setUnreadOnly(false)} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', !unreadOnly ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>All</button>
        <button onClick={() => setUnreadOnly(true)} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', unreadOnly ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>Unread</button>
      </div>

      <div className="card p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-400">Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Inbox className="h-7 w-7" /></span>
            <p className="text-sm text-slate-400">{unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}</p>
          </div>
        ) : (
          <ul>
            {data.items.map((n) => (
              <li
                key={n.id}
                className={cn('flex items-start gap-3 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800/60', !n.readAt && 'bg-brand-50/40 dark:bg-brand-600/5')}
              >
                <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', channelDot[n.channel] ?? 'bg-slate-400')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)} · {n.event.replaceAll('_', ' ')} · {n.channel.replaceAll('_', ' ')}</p>
                </div>
                {!n.readAt && (
                  <button onClick={() => markRead.mutate(n.id)} className="shrink-0 text-xs text-brand-600 hover:underline">Mark read</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
