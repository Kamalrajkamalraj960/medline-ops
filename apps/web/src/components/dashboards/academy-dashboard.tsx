'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { KpiCard } from '@/components/ui';

interface AcademyStats {
  totalStudents: number;
  activeStudents: number;
  activeBatches: number;
  upcomingBatches: number;
  courses: number;
  faculty: number;
  demos: number;
  monthlyEnrollments: number;
}

export function AcademyDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['academy-stats'], queryFn: async () => (await api.get<AcademyStats>('/academy/stats')).data });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Students" value={isLoading ? '—' : data!.totalStudents} icon="GraduationCap" accent="brand" />
        <KpiCard label="Active Students" value={isLoading ? '—' : data!.activeStudents} icon="UserCheck" accent="green" delay={0.05} />
        <KpiCard label="Active Batches" value={isLoading ? '—' : data!.activeBatches} icon="CalendarCheck" accent="violet" delay={0.1} />
        <KpiCard label="Upcoming Batches" value={isLoading ? '—' : data!.upcomingBatches} icon="CalendarPlus" accent="amber" delay={0.15} />
        <KpiCard label="Courses" value={isLoading ? '—' : data!.courses} icon="BookOpen" accent="brand" delay={0.2} />
        <KpiCard label="Faculty" value={isLoading ? '—' : data!.faculty} icon="Users" accent="violet" delay={0.25} />
        <KpiCard label="Demo Sessions" value={isLoading ? '—' : data!.demos} icon="PlayCircle" accent="rose" delay={0.3} />
        <KpiCard label="Enrollments (Month)" value={isLoading ? '—' : data!.monthlyEnrollments} icon="TrendingUp" accent="green" delay={0.35} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { href: '/students', label: 'Students' },
          { href: '/batches', label: 'Batches' },
          { href: '/courses', label: 'Courses' },
          { href: '/demos', label: 'Demos' },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="card text-center transition hover:border-brand-400 hover:shadow-md">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{q.label} →</p>
          </Link>
        ))}
      </div>
    </>
  );
}
