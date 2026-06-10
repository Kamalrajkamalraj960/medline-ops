'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen, SearchX } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { PageHeader } from '@/components/ui';
import { CourseStats } from '@/components/academy/CourseStats';
import { CourseFilters, EMPTY_CATALOG_FILTERS, type CatalogFilters } from '@/components/academy/CourseFilters';
import { CourseCard, type CourseAction } from '@/components/academy/CourseCard';
import { CourseFormModal, type CourseFormValues } from '@/components/academy/CourseFormModal';
import { ConfirmDialog } from '@/components/academy/ConfirmDialog';
import type { AcademyStats, Course } from '@/lib/types';

export default function AcademyCatalogPage() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission('course:create'));
  const canEdit = useAuthStore((s) => s.hasPermission('course:edit'));
  const canDelete = useAuthStore((s) => s.hasPermission('course:delete'));

  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  // Main catalog query — refetches whenever filters change.
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses', filters],
    queryFn: async () =>
      (
        await api.get<Course[]>('/academy/courses', {
          params: {
            search: filters.search || undefined,
            category: filters.category !== 'all' ? filters.category : undefined,
            status: filters.status,
            sort: filters.sort,
          },
        })
      ).data,
  });

  // Stats for the summary cards.
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['academy-stats'],
    queryFn: async () => (await api.get<AcademyStats>('/academy/stats')).data,
  });

  // Distinct categories for the filter dropdown (unfiltered list).
  const { data: allCourses } = useQuery({
    queryKey: ['courses', 'all-for-categories'],
    queryFn: async () => (await api.get<Course[]>('/academy/courses')).data,
  });
  const categories = useMemo(
    () => Array.from(new Set((allCourses ?? []).map((c) => c.category).filter(Boolean) as string[])).sort(),
    [allCourses],
  );

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['courses'] });
    qc.invalidateQueries({ queryKey: ['academy-stats'] });
  }

  const saveMutation = useMutation({
    mutationFn: async (values: CourseFormValues) =>
      editing
        ? (await api.patch(`/academy/courses/${editing.id}`, values)).data
        : (await api.post('/academy/courses', values)).data,
    onSuccess: () => {
      setFormOpen(false);
      setEditing(null);
      invalidateAll();
    },
    onError: (e) => setFormError(apiErrorMessage(e, 'Failed to save course')),
  });

  const quickMutation = useMutation({
    mutationFn: async ({ course, body }: { course: Course; body: Record<string, unknown> }) =>
      (await api.patch(`/academy/courses/${course.id}`, body)).data,
    onSuccess: invalidateAll,
  });

  const duplicateMutation = useMutation({
    mutationFn: async (course: Course) => (await api.post(`/academy/courses/${course.id}/duplicate`)).data,
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: async (course: Course) => (await api.delete(`/academy/courses/${course.id}`)).data,
    onSuccess: () => {
      setDeleteTarget(null);
      invalidateAll();
    },
    onError: (e) => {
      // Surface the "has students/batches" conflict to the user.
      setDeleteTarget(null);
      window.alert(apiErrorMessage(e, 'Failed to delete course'));
    },
  });

  function handleAction(action: CourseAction, course: Course) {
    switch (action) {
      case 'edit':
        setEditing(course);
        setFormError(null);
        setFormOpen(true);
        break;
      case 'duplicate':
        duplicateMutation.mutate(course);
        break;
      case 'toggle-active':
        quickMutation.mutate({ course, body: { isActive: !course.isActive } });
        break;
      case 'archive':
        quickMutation.mutate({ course, body: { archived: true } });
        break;
      case 'restore':
        quickMutation.mutate({ course, body: { archived: false } });
        break;
      case 'delete':
        setDeleteTarget(course);
        break;
    }
  }

  const activeCount = stats?.activeCourses ?? (courses ?? []).filter((c) => c.isActive && !c.archivedAt).length;

  return (
    <div>
      <PageHeader
        title="Course Catalog"
        subtitle={`${activeCount} active course${activeCount === 1 ? '' : 's'}`}
        action={
          canCreate && (
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setFormError(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New Course
            </button>
          )
        }
      />

      <CourseStats stats={stats} loading={statsLoading} />

      <CourseFilters filters={filters} onChange={setFilters} categories={categories} />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-800/40"
            />
          ))}
        </div>
      ) : !courses || courses.length === 0 ? (
        <EmptyState
          hasFilters={filters.search !== '' || filters.category !== 'all' || filters.status !== 'all'}
          canCreate={canCreate}
          onCreate={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              canEdit={canEdit}
              canDelete={canDelete}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <CourseFormModal
          course={editing}
          saving={saveMutation.isPending}
          error={formError}
          onSubmit={(values) => {
            setFormError(null);
            saveMutation.mutate(values);
          }}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete course?"
          message={`“${deleteTarget.name}” will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete"
          tone="danger"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function EmptyState({
  hasFilters,
  canCreate,
  onCreate,
}: {
  hasFilters: boolean;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        {hasFilters ? <SearchX className="h-7 w-7" /> : <BookOpen className="h-7 w-7" />}
      </span>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        {hasFilters ? 'No courses match your filters' : 'No courses yet'}
      </h2>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {hasFilters
          ? 'Try adjusting your search, category or status filters.'
          : 'Create your first course to start building the catalog.'}
      </p>
      {!hasFilters && canCreate && (
        <button className="btn-primary mt-1" onClick={onCreate}>
          <Plus className="h-4 w-4" /> New Course
        </button>
      )}
    </div>
  );
}
