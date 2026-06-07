'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Activity, Loader2, ShieldCheck } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { homePathForRole } from '@/config/nav';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'super_admin@medline.com', password: '1001' },
  { label: 'Operations Manager', email: 'operations_manager@medline.com', password: '2001' },
  { label: 'Sales Manager', email: 'sales_manager@medline.com', password: '3001' },
  { label: 'Sales Executive', email: 'sales_executive@medline.com', password: '4001' },
  { label: 'Accounts', email: 'accounts@medline.com', password: '5001' },
  { label: 'Academy Head', email: 'academy_head@medline.com', password: '6001' },
  { label: 'Marketing', email: 'marketing@medline.com', password: '7001' },
  { label: 'Documentation', email: 'documentation_team@medline.com', password: '8001' },
  { label: 'Client / Student', email: 'client@medline.com', password: '9999' },
];

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { identifier, password });
      setSession(data);
      router.replace(homePathForRole(data.user.role));
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  }

  function quickFill(email: string, pw: string) {
    setIdentifier(email);
    setPassword(pw);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700">
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-6 py-12 lg:flex-row lg:justify-between">
        {/* Brand panel */}
        <div className="max-w-md text-white">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur">
            <Activity className="h-4 w-4" /> Medline Ops
          </div>
          <h1 className="text-4xl font-bold leading-tight">Enterprise operations for healthcare licensing &amp; academy.</h1>
          <p className="mt-4 text-white/80">
            One platform for CRM, consultancy cases, authority submissions, academy, accounts and marketing — with
            granular RBAC and a full audit trail.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-white/80">
            <ShieldCheck className="h-4 w-4" /> JWT auth · refresh tokens · role-based access
          </div>
        </div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass w-full max-w-md rounded-3xl p-8"
        >
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use your email or username.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email or username</label>
              <input
                className="input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="super_admin@medline.com"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Demo accounts</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => quickFill(a.email, a.password)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-left text-xs text-slate-600 transition hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
