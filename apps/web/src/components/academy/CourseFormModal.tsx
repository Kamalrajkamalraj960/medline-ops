'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Drawer } from '@/components/drawer';
import type { Course } from '@/lib/types';

/** Payload sent to the API for create/update. */
export interface CourseFormValues {
  name: string;
  description?: string;
  category?: string;
  profession?: string;
  level?: string;
  durationWeeks?: number;
  price?: number;
  thumbnailUrl?: string;
  learningObjectives?: string[];
  syllabus?: string;
  isActive?: boolean;
}

interface CourseFormModalProps {
  course?: Course | null; // present → edit mode
  saving?: boolean;
  error?: string | null;
  onSubmit: (values: CourseFormValues) => void;
  onClose: () => void;
}

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export function CourseFormModal({ course, saving, error, onSubmit, onClose }: CourseFormModalProps) {
  const editing = !!course;
  const [form, setForm] = useState({
    name: course?.name ?? '',
    description: course?.description ?? '',
    category: course?.category ?? '',
    profession: course?.profession ?? '',
    level: course?.level ?? 'Beginner',
    durationWeeks: course?.durationWeeks != null ? String(course.durationWeeks) : '',
    price: course?.price != null ? String(course.price) : '',
    thumbnailUrl: course?.thumbnailUrl ?? '',
    syllabus: course?.syllabus ?? '',
    isActive: course?.isActive ?? true,
  });
  const [objectives, setObjectives] = useState<string[]>(course?.learningObjectives ?? ['']);
  const [localError, setLocalError] = useState<string | null>(null);

  function setObjective(i: number, value: string) {
    setObjectives((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }
  function addObjective() {
    setObjectives((prev) => [...prev, '']);
  }
  function removeObjective(i: number) {
    setObjectives((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (form.name.trim().length < 2) {
      setLocalError('Course name must be at least 2 characters.');
      return;
    }
    const cleanedObjectives = objectives.map((o) => o.trim()).filter(Boolean);
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      profession: form.profession.trim() || undefined,
      level: form.level,
      durationWeeks: form.durationWeeks ? Number(form.durationWeeks) : undefined,
      price: form.price ? Number(form.price) : undefined,
      thumbnailUrl: form.thumbnailUrl.trim() || undefined,
      learningObjectives: cleanedObjectives.length ? cleanedObjectives : undefined,
      syllabus: form.syllabus.trim() || undefined,
      isActive: form.isActive,
    });
  }

  return (
    <Drawer title={editing ? 'Edit Course' : 'New Course'} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="label">Course name *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="DHA Nursing Exam Preparation"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[72px] resize-y"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Short summary shown on the catalog card."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Nursing"
            />
          </div>
          <div>
            <label className="label">Profession</label>
            <input
              className="input"
              value={form.profession}
              onChange={(e) => setForm({ ...form, profession: e.target.value })}
              placeholder="Staff Nurse"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Level</label>
            <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Duration (wks)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={form.durationWeeks}
              onChange={(e) => setForm({ ...form, durationWeeks: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Price (₹)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Thumbnail URL</label>
          <input
            className="input"
            value={form.thumbnailUrl}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            placeholder="https://…/course.jpg"
          />
        </div>

        {/* Learning objectives — dynamic list */}
        <div>
          <label className="label">Learning objectives</label>
          <div className="space-y-2">
            {objectives.map((obj, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input"
                  value={obj}
                  onChange={(e) => setObjective(i, e.target.value)}
                  placeholder={`Objective ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeObjective(i)}
                  className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                  aria-label="Remove objective"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addObjective}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            <Plus className="h-4 w-4" /> Add objective
          </button>
        </div>

        <div>
          <label className="label">Syllabus</label>
          <textarea
            className="input min-h-[96px] resize-y"
            value={form.syllabus}
            onChange={(e) => setForm({ ...form, syllabus: e.target.value })}
            placeholder="Module breakdown, topics covered, weekly plan…"
          />
        </div>

        <div>
          <label className="label">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: true, label: 'Active' },
              { v: false, label: 'Inactive' },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setForm({ ...form, isActive: opt.v })}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  form.isActive === opt.v
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                    : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {(localError || error) && (
          <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {localError || error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? 'Save Changes' : 'Create Course'}
        </button>
      </form>
    </Drawer>
  );
}
