'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BookOpen, Users, CalendarDays, Clock, Pencil, MoreVertical, Copy, Archive,
  ArchiveRestore, Power, PowerOff, Trash2,
} from 'lucide-react';
import { cn, inr } from '@/lib/utils';
import { Badge } from '@/components/ui';
import type { Course } from '@/lib/types';

export type CourseAction = 'edit' | 'duplicate' | 'toggle-active' | 'archive' | 'restore' | 'delete';

interface CourseCardProps {
  course: Course;
  canEdit: boolean;
  canDelete: boolean;
  onAction: (action: CourseAction, course: Course) => void;
}

function statusBadge(course: Course) {
  if (course.archivedAt) return <Badge tone="amber">Archived</Badge>;
  return course.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>;
}

export function CourseCard({ course, canEdit, canDelete, onAction }: CourseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const archived = !!course.archivedAt;
  const fee = course.price != null && Number(course.price) > 0 ? inr(Number(course.price)) : 'Free';

  function fire(action: CourseAction) {
    setMenuOpen(false);
    onAction(action, course);
  }

  return (
    <div className="card group relative flex flex-col transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:hover:border-brand-600/40">
      {/* Header: thumbnail/icon + status + actions */}
      <div className="mb-3 flex items-start justify-between gap-3">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300">
            <BookOpen className="h-5 w-5" />
          </span>
        )}

        <div className="flex items-center gap-1.5">
          {statusBadge(course)}
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => onAction('edit', course)}
                className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Edit course"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="More actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <MenuItem icon={<Pencil className="h-4 w-4" />} label="Edit" onClick={() => fire('edit')} />
                    <MenuItem icon={<Copy className="h-4 w-4" />} label="Duplicate" onClick={() => fire('duplicate')} />
                    {!archived &&
                      (course.isActive ? (
                        <MenuItem icon={<PowerOff className="h-4 w-4" />} label="Deactivate" onClick={() => fire('toggle-active')} />
                      ) : (
                        <MenuItem icon={<Power className="h-4 w-4" />} label="Activate" onClick={() => fire('toggle-active')} />
                      ))}
                    {archived ? (
                      <MenuItem icon={<ArchiveRestore className="h-4 w-4" />} label="Restore" onClick={() => fire('restore')} />
                    ) : (
                      <MenuItem icon={<Archive className="h-4 w-4" />} label="Archive" onClick={() => fire('archive')} />
                    )}
                    {canDelete && (
                      <>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                        <MenuItem
                          icon={<Trash2 className="h-4 w-4" />}
                          label="Delete"
                          danger
                          onClick={() => fire('delete')}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <h3 className="font-semibold text-slate-900 dark:text-white">{course.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500 dark:text-slate-400">
        {course.description || 'No description provided.'}
      </p>

      {/* Category / profession chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {course.category && (
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {course.category}
          </span>
        )}
        {course.profession && (
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {course.profession}
          </span>
        )}
        {course.level && (
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {course.level}
          </span>
        )}
      </div>

      {/* Meta: duration + fee */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Clock className="h-4 w-4" />
          {course.durationWeeks ? `${course.durationWeeks} wks` : '—'}
        </span>
        <span className="text-base font-bold text-slate-900 dark:text-white">{fee}</span>
      </div>

      {/* Footer: counts */}
      <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> {course._count.students} students
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" /> {course._count.batches} batches
        </span>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition',
        danger
          ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
