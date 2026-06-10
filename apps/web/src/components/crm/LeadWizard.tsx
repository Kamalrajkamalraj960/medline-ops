'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, X, Loader2, ChevronLeft, ChevronRight, GraduationCap, Briefcase } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast-store';
import {
  COUNTRY_CODES, GENDERS, COUNTRIES, NATIONALITIES, PROFESSIONS, URGENCIES,
  LEAD_SOURCES, WIZARD_PRIORITIES, STEPS,
} from './wizard-data';

interface AssignableUser {
  id: string;
  name: string;
  role: { name: string; label: string };
}

interface LeadWizardProps {
  onClose: () => void;
  onCreated: () => void;
}

const initialForm = {
  // Step 1
  fullName: '',
  countryCode: '+91',
  mobile: '',
  sameAsWhatsapp: false,
  whatsappCode: '+91',
  whatsapp: '',
  email: '',
  dob: '',
  gender: '',
  currentCountry: '',
  nationality: '',
  // Step 2
  profession: '',
  professionOther: '',
  experience: '',
  employer: '',
  qualification: '',
  // Step 3
  serviceType: '' as '' | 'consultancy' | 'academy',
  urgency: 'WITHIN_3_MONTHS',
  // Step 4
  leadSource: '',
  sourceDetails: '',
  priority: 'MEDIUM',
  assignTo: 'auto',
  notes: '',
};

type FormState = typeof initialForm;

export function LeadWizard({ onClose, onCreated }: LeadWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const [forceCreate, setForceCreate] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const { data: assignable } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: async () => (await api.get<AssignableUser[]>('/users/assignable')).data,
  });

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/leads', buildPayload(form, forceCreate))).data,
    onSuccess: () => {
      toast.success('Lead created successfully');
      onCreated();
    },
    onError: (err: unknown) => {
      const msg = apiErrorMessage(err, 'Failed to create lead');
      if (msg.toLowerCase().includes('duplicate')) {
        setDupWarning('A lead with this mobile/email may already exist. Click "Create Lead" again to add anyway.');
        setForceCreate(true);
      } else {
        toast.error(msg);
      }
    },
  });

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (form.fullName.trim().length < 2) e.fullName = 'Full name is required.';
      if (!form.mobile.trim()) e.mobile = 'Mobile number is required.';
      else if (!/^[0-9][0-9\s-]{5,}$/.test(form.mobile.trim())) e.mobile = 'Enter a valid mobile number.';
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.';
    }
    if (s === 1) {
      if (!form.profession) e.profession = 'Profession is required.';
      if (form.profession === 'Other' && !form.professionOther.trim()) e.professionOther = 'Please specify the profession.';
    }
    if (s === 2) {
      if (!form.serviceType) e.serviceType = 'Select a service type.';
    }
    if (s === 3) {
      if (!form.leadSource) e.leadSource = 'Lead source is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }
  function submit() {
    // Re-validate every step so users can't slip past required fields.
    for (let s = 0; s <= 3; s++) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div
        className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Register New Lead</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <ol className="flex items-center">
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={label} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition',
                        done && 'bg-brand-600 text-white',
                        active && 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-600/20',
                        !done && !active && 'bg-slate-100 text-slate-400 dark:bg-slate-800',
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        'hidden text-sm font-medium sm:block',
                        active ? 'text-slate-900 dark:text-white' : 'text-slate-400',
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span className={cn('mx-2 h-px flex-1', done ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700')} />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Body */}
        <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
          {step === 0 && <StepBasic form={form} set={set} errors={errors} />}
          {step === 1 && <StepProfessional form={form} set={set} errors={errors} />}
          {step === 2 && <StepService form={form} set={set} errors={errors} />}
          {step === 3 && (
            <StepSource form={form} set={set} errors={errors} assignable={assignable ?? []} dupWarning={dupWarning} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={next} className="btn-primary">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={submit} className="btn-primary" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {forceCreate ? 'Create Anyway' : 'Create Lead'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Build the API payload from wizard state.
// ---------------------------------------------------------------------------
function buildPayload(form: FormState, forceCreate: boolean) {
  const phone = `${form.countryCode} ${form.mobile.trim()}`;
  const whatsapp = form.sameAsWhatsapp
    ? phone
    : form.whatsapp.trim()
      ? `${form.whatsappCode} ${form.whatsapp.trim()}`
      : undefined;
  const profession = form.profession === 'Other' ? form.professionOther.trim() || 'Other' : form.profession;
  const ownerId = form.assignTo === 'auto' || form.assignTo === 'unassigned' ? undefined : form.assignTo;

  return {
    name: form.fullName.trim(),
    phone,
    whatsapp,
    email: form.email.trim() || undefined,
    dateOfBirth: form.dob || undefined,
    gender: form.gender || undefined,
    currentCountry: form.currentCountry || undefined,
    nationality: form.nationality || undefined,
    profession: profession || undefined,
    experienceYears: form.experience ? Number(form.experience) : undefined,
    currentEmployer: form.employer.trim() || undefined,
    highestQualification: form.qualification.trim() || undefined,
    serviceType: form.serviceType,
    urgency: form.urgency,
    leadSource: form.leadSource,
    sourceDetails: form.sourceDetails.trim() || undefined,
    priority: form.priority,
    ownerId,
    remarks: form.notes.trim() || undefined,
    forceCreate,
  };
}

// ---------------------------------------------------------------------------
// Shared field helpers
// ---------------------------------------------------------------------------
type SetFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{msg}</p>;
}

function Field({ label, required, children, error }: { label: string; required?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      <Err msg={error} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Basic Info
// ---------------------------------------------------------------------------
function StepBasic({ form, set, errors }: { form: FormState; set: SetFn; errors: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <Field label="Full Name" required error={errors.fullName}>
        <input
          className="input"
          value={form.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          placeholder="e.g. Anjali Krishnan"
        />
      </Field>

      <Field label="Mobile Number" required error={errors.mobile}>
        <div className="flex gap-2">
          <select className="input w-28 shrink-0" value={form.countryCode} onChange={(e) => set('countryCode', e.target.value)}>
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={form.mobile}
            onChange={(e) => set('mobile', e.target.value)}
            placeholder="98470 11234"
            inputMode="tel"
          />
        </div>
      </Field>

      <Field label="WhatsApp Number">
        <label className="mb-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.sameAsWhatsapp}
            onChange={(e) => set('sameAsWhatsapp', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
          />
          Same as Mobile Number
        </label>
        {!form.sameAsWhatsapp && (
          <div className="flex gap-2">
            <select className="input w-28 shrink-0" value={form.whatsappCode} onChange={(e) => set('whatsappCode', e.target.value)}>
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              className="input"
              value={form.whatsapp}
              onChange={(e) => set('whatsapp', e.target.value)}
              placeholder="Optional"
              inputMode="tel"
            />
          </div>
        )}
      </Field>

      <Field label="Email Address" error={errors.email}>
        <input
          className="input"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="name@example.com"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of Birth">
          <input className="input" type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
        </Field>
        <Field label="Gender">
          <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Select…</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Current Country">
          <select className="input" value={form.currentCountry} onChange={(e) => set('currentCountry', e.target.value)}>
            <option value="">Select…</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nationality">
          <select className="input" value={form.nationality} onChange={(e) => set('nationality', e.target.value)}>
            <option value="">Select…</option>
            {NATIONALITIES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Professional
// ---------------------------------------------------------------------------
function StepProfessional({ form, set, errors }: { form: FormState; set: SetFn; errors: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <Field label="Profession" required error={errors.profession}>
        <select className="input" value={form.profession} onChange={(e) => set('profession', e.target.value)}>
          <option value="">Select…</option>
          {PROFESSIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>

      {form.profession === 'Other' && (
        <Field label="Specify profession" required error={errors.professionOther}>
          <input
            className="input"
            value={form.professionOther}
            onChange={(e) => set('professionOther', e.target.value)}
            placeholder="e.g. Occupational Therapist"
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Years of Experience">
          <input
            className="input"
            type="number"
            min={0}
            max={60}
            value={form.experience}
            onChange={(e) => set('experience', e.target.value)}
            placeholder="e.g. 3"
          />
        </Field>
        <Field label="Current Employer">
          <input
            className="input"
            value={form.employer}
            onChange={(e) => set('employer', e.target.value)}
            placeholder="e.g. Apollo Hospitals"
          />
        </Field>
      </div>

      <Field label="Highest Qualification">
        <input
          className="input"
          value={form.qualification}
          onChange={(e) => set('qualification', e.target.value)}
          placeholder="e.g. BSc Nursing, GNM, B.Pharm, DMLT, BPT, MBBS"
        />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Service
// ---------------------------------------------------------------------------
function StepService({ form, set, errors }: { form: FormState; set: SetFn; errors: Record<string, string> }) {
  const options = [
    { value: 'consultancy' as const, label: 'Consultancy', desc: 'Licensing, DataFlow, exam & visa support', icon: <Briefcase className="h-5 w-5" /> },
    { value: 'academy' as const, label: 'Academy', desc: 'Coaching, courses, batches & demos', icon: <GraduationCap className="h-5 w-5" /> },
  ];
  return (
    <div className="space-y-5">
      <div>
        <label className="label">
          Service Type <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((o) => {
            const selected = form.serviceType === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => set('serviceType', o.value)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition',
                  selected
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-600/10'
                    : 'border-slate-200 hover:border-brand-300 dark:border-slate-700',
                )}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800',
                  )}
                >
                  {o.icon}
                </span>
                <span>
                  <span className={cn('block font-semibold', selected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-900 dark:text-white')}>
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{o.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        <Err msg={errors.serviceType} />
        <p className="mt-2 text-xs text-slate-400">A lead belongs to exactly one service track — consultancy or academy.</p>
      </div>

      <Field label="Urgency">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {URGENCIES.map((u) => (
            <button
              key={u.value}
              type="button"
              onClick={() => set('urgency', u.value)}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-xs font-medium transition',
                form.urgency === u.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                  : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300',
              )}
            >
              {u.label}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Source & Assign
// ---------------------------------------------------------------------------
function StepSource({
  form,
  set,
  errors,
  assignable,
  dupWarning,
}: {
  form: FormState;
  set: SetFn;
  errors: Record<string, string>;
  assignable: AssignableUser[];
  dupWarning: string | null;
}) {
  return (
    <div className="space-y-4">
      <Field label="Lead Source" required error={errors.leadSource}>
        <select className="input" value={form.leadSource} onChange={(e) => set('leadSource', e.target.value)}>
          <option value="">Select…</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Source Details">
        <input
          className="input"
          value={form.sourceDetails}
          onChange={(e) => set('sourceDetails', e.target.value)}
          placeholder="Campaign name, referrer, page…"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
            {WIZARD_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assign To">
          <select className="input" value={form.assignTo} onChange={(e) => set('assignTo', e.target.value)}>
            <option value="auto">Auto Assign</option>
            <option value="unassigned">Unassigned</option>
            {assignable.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.role.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Initial Notes / Conversation">
        <textarea
          className="input min-h-[110px] resize-y"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder={'What was discussed?\nKey interests, objections,\nfollow-up actions, next steps…'}
        />
      </Field>

      {dupWarning && (
        <div className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {dupWarning}
        </div>
      )}
    </div>
  );
}
