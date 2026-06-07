'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { homePathForRole } from '@/config/nav';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    router.replace(user ? homePathForRole(user.role) : '/login');
  }, [user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-slate-400">
      Loading Medline Ops…
    </div>
  );
}
