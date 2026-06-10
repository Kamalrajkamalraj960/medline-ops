'use client';

import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore, type ToastTone } from '@/lib/toast-store';

const TONES: Record<ToastTone, { icon: React.ReactNode; ring: string }> = {
  success: { icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, ring: 'border-emerald-200 dark:border-emerald-900/50' },
  error: { icon: <AlertTriangle className="h-5 w-5 text-rose-500" />, ring: 'border-rose-200 dark:border-rose-900/50' },
  info: { icon: <Info className="h-5 w-5 text-blue-500" />, ring: 'border-blue-200 dark:border-blue-900/50' },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg dark:bg-slate-900',
            TONES[t.tone].ring,
          )}
          role="status"
        >
          {TONES[t.tone].icon}
          <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{t.message}</p>
          <button
            onClick={() => dismiss(t.id)}
            className="rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
