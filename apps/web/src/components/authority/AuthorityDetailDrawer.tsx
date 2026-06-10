'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Loader2, Clock, CheckCircle2, XCircle, Save, Plus, Upload, Phone, Mail, Briefcase,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { toast } from '@/lib/toast-store';
import {
  AuthorityStatusBadge, FollowUpBadge, fmtDate, STATUS_OPTIONS,
  type AuthorityDetail,
} from './authorityMeta';

interface DrawerProps {
  id: string;
  canEdit: boolean;
  onClose: () => void;
}

export function AuthorityDetailDrawer({ id, canEdit, onClose }: DrawerProps) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['authority', id],
    queryFn: async () => (await api.get<AuthorityDetail>(`/authority-tracking/${id}`)).data,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ['authority'] });
    qc.invalidateQueries({ queryKey: ['authority-list'] });
    qc.invalidateQueries({ queryKey: ['authority-stats'] });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{data?.clientName ?? 'Authority Record'}</h2>
            <p className="font-mono text-xs text-slate-400">{data?.caseReference ?? ''}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !data ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <Body data={data} canEdit={canEdit} onChanged={refresh} />
        )}
      </div>
    </div>
  );
}

function Body({ data, canEdit, onChanged }: { data: AuthorityDetail; canEdit: boolean; onChanged: () => void }) {
  const [status, setStatus] = useState(data.status);
  const [refNo, setRefNo] = useState(data.referenceNumber ?? '');
  const [expected, setExpected] = useState(data.expectedCompletionDate ? data.expectedCompletionDate.slice(0, 10) : '');
  const [submitted, setSubmitted] = useState(data.submissionDate ? data.submissionDate.slice(0, 10) : '');
  const [followNote, setFollowNote] = useState('');
  const [followDue, setFollowDue] = useState('');
  const [docCategory, setDocCategory] = useState('Additional Documents');
  const [docUrl, setDocUrl] = useState('');

  const post = (path: string, body: unknown) => api.post(`/authority-tracking/${data.id}${path}`, body).then((r) => r.data);

  const statusMut = useMutation({
    mutationFn: (s: string) => post('/status', { status: s }),
    onSuccess: () => { toast.success('Status updated'); onChanged(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const detailMut = useMutation({
    mutationFn: () => api.put(`/authority-tracking/${data.id}`, {
      referenceNumber: refNo || undefined,
      expectedCompletionDate: expected || undefined,
      submissionDate: submitted || undefined,
    }).then((r) => r.data),
    onSuccess: () => { toast.success('Details saved'); onChanged(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const followMut = useMutation({
    mutationFn: () => post('/followup', { notes: followNote, dueAt: followDue || undefined }),
    onSuccess: () => { toast.success('Follow-up added'); setFollowNote(''); setFollowDue(''); onChanged(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const uploadMut = useMutation({
    mutationFn: () => post('/upload', { category: docCategory, fileUrl: docUrl || undefined }),
    onSuccess: () => { toast.success('Document recorded'); setDocUrl(''); onChanged(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const busy = statusMut.isPending || detailMut.isPending || followMut.isPending || uploadMut.isPending;

  return (
    <div className="flex-1 space-y-6 px-6 py-5">
      {/* Authority Information */}
      <Section title="Authority Information">
        <Row label="Authority" value={data.authority} />
        <Row label="Current Status" value={<AuthorityStatusBadge status={data.status} />} />
        <Row label="Reference Number" value={data.referenceNumber || '—'} mono />
        <Row label="Submission Date" value={fmtDate(data.submissionDate)} />
        <Row label="Expected Completion" value={fmtDate(data.expectedCompletionDate)} />
        <Row
          label="Days Pending"
          value={['APPROVED', 'REJECTED', 'CLOSED'].includes(data.status) ? '—' : `${data.daysPending}d`}
        />
        <Row label="Follow-Up" value={<FollowUpBadge status={data.followUpStatus} />} />
      </Section>

      {/* Client Information */}
      <Section title="Client Information">
        <Row label="Client" value={data.clientName} />
        <Row label="Case ID" value={data.caseReference || '—'} mono />
        <Row label="Profession" value={data.profession || '—'} icon={<Briefcase className="h-3.5 w-3.5" />} />
        <Row label="Mobile" value={data.clientPhone || '—'} icon={<Phone className="h-3.5 w-3.5" />} />
        <Row label="Email" value={data.clientEmail || '—'} icon={<Mail className="h-3.5 w-3.5" />} />
      </Section>

      {/* Update workflow */}
      {canEdit && (
        <Section title="Update Workflow">
          <div className="space-y-3">
            <div className="flex gap-2">
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => statusMut.mutate(status)} disabled={busy} className="btn-primary shrink-0">
                <Save className="h-4 w-4" /> Update
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => statusMut.mutate('APPROVED')}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark Approved
              </button>
              <button
                type="button"
                onClick={() => statusMut.mutate('REJECTED')}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" /> Mark Rejected
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div>
                <label className="label">Reference Number</label>
                <input className="input" value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Authority reference" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Submission Date</label>
                  <input className="input" type="date" value={submitted} onChange={(e) => setSubmitted(e.target.value)} />
                </div>
                <div>
                  <label className="label">Expected Completion</label>
                  <input className="input" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
                </div>
              </div>
              <button type="button" onClick={() => detailMut.mutate()} disabled={busy} className="btn-primary w-full">
                {detailMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Details
              </button>
            </div>

            {/* Add follow-up */}
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <label className="label">Add Follow-Up Note</label>
              <textarea
                className="input min-h-[64px] resize-y"
                value={followNote}
                onChange={(e) => setFollowNote(e.target.value)}
                placeholder="Called authority, awaiting response…"
              />
              <div className="mt-2 flex gap-2">
                <input className="input" type="date" value={followDue} onChange={(e) => setFollowDue(e.target.value)} />
                <button
                  type="button"
                  onClick={() => followMut.mutate()}
                  disabled={busy || !followNote.trim()}
                  className="btn-primary shrink-0"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>

            {/* Upload document */}
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <label className="label">Upload / Record Document</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input className="input" value={docCategory} onChange={(e) => setDocCategory(e.target.value)} placeholder="Category" />
                <input className="input" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="File URL (optional)" />
                <button type="button" onClick={() => uploadMut.mutate()} disabled={busy} className="btn-primary shrink-0">
                  <Upload className="h-4 w-4" /> Add
                </button>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Timeline */}
      <Section title="Timeline">
        {data.timeline.length === 0 ? (
          <p className="text-sm text-slate-400">No activity yet.</p>
        ) : (
          <ol className="space-y-3">
            {data.timeline.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t.event}</p>
                  <p className="text-xs text-slate-400">{new Date(t.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  {t.detail && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value, mono, icon }: { label: string; value: React.ReactNode; mono?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </span>
      <span className={`text-right text-sm font-medium text-slate-900 dark:text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
