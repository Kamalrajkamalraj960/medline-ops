'use client';

import { use, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Clock, Eye, FileText, Loader2, Plus, Upload, XCircle } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge, ProgressBar } from '@/components/ui';
import type { CaseStage, ConsultancyCaseDetail } from '@/lib/types';

const docTone = (s: string): 'slate' | 'blue' | 'amber' | 'green' | 'rose' => {
  if (s === 'VERIFIED') return 'green';
  if (s === 'REJECTED') return 'rose';
  if (s === 'UNDER_REVIEW' || s === 'UPLOADED') return 'amber';
  if (s === 'MISSING') return 'slate';
  return 'blue';
};

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const canEdit = useAuthStore((s) => s.hasPermission('case:edit'));
  const canApproveDocs = useAuthStore((s) => s.hasPermission('document:approve'));
  const canUploadDocs = useAuthStore((s) => s.hasPermission('document:edit'));
  const [uploadBusyId, setUploadBusyId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: async () => (await api.get<ConsultancyCaseDetail>(`/consultancy/${id}`)).data,
  });
  const { data: meta } = useQuery({ queryKey: ['case-meta'], queryFn: async () => (await api.get<{ stages: CaseStage[] }>('/consultancy/meta')).data });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['case', id] });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => (await api.patch(`/consultancy/${id}/status`, { status })).data,
    onSuccess: invalidate,
  });
  const addDoc = useMutation({
    mutationFn: async (category: string) => (await api.post(`/consultancy/${id}/documents`, { category })).data,
    onSuccess: invalidate,
  });
  const updateDoc = useMutation({
    mutationFn: async (v: { documentId: string; status: string; rejectionReason?: string }) =>
      (await api.patch(`/consultancy/documents/${v.documentId}`, { status: v.status, rejectionReason: v.rejectionReason })).data,
    onSuccess: invalidate,
  });
  const addFollowUp = useMutation({
    mutationFn: async (v: { type: string; notes?: string }) => (await api.post(`/consultancy/${id}/follow-ups`, v)).data,
    onSuccess: invalidate,
  });
  const completeFollowUp = useMutation({
    mutationFn: async (followUpId: string) => (await api.patch(`/consultancy/follow-ups/${followUpId}/complete`)).data,
    onSuccess: invalidate,
  });
  const updateAuthority = useMutation({
    mutationFn: async (v: { status: string; referenceNumber?: string }) => (await api.patch(`/consultancy/${id}/authority`, v)).data,
    onSuccess: invalidate,
  });

  // Presigned S3 upload, then record the object key on the document.
  async function uploadFile(documentId: string, file: File) {
    setUploadError(null);
    setUploadBusyId(documentId);
    try {
      const contentType = file.type || 'application/octet-stream';
      const { data: presign } = await api.post(`/consultancy/documents/${documentId}/presign`, { fileName: file.name, contentType });
      const put = await fetch(presign.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      await api.patch(`/consultancy/documents/${documentId}`, { status: 'UPLOADED', fileUrl: presign.key });
      invalidate();
    } catch (e) {
      setUploadError(apiErrorMessage(e, 'Upload failed'));
    } finally {
      setUploadBusyId(null);
    }
  }
  async function viewFile(documentId: string) {
    try {
      const { data: dl } = await api.get<{ url: string }>(`/consultancy/documents/${documentId}/download`);
      window.open(dl.url, '_blank', 'noopener');
    } catch (e) {
      setUploadError(apiErrorMessage(e, 'Could not open document'));
    }
  }

  if (isLoading || !caseData) return <p className="text-sm text-slate-400">Loading case…</p>;
  const c = caseData;

  return (
    <div className="space-y-5">
      <Link href="/consultancy" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> All cases
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-slate-400">{c.reference}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{c.lead.name}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {c.authority} · {c.profession ?? c.lead.profession ?? 'Profession N/A'} · {c.lead.phone}
            </p>
          </div>
          <div className="text-right">
            <Badge tone="violet">{c.status.replaceAll('_', ' ')}</Badge>
            <p className="mt-2 text-xs text-slate-400">Priority: {c.priority}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={c.progressPct} />
          <span className="text-sm font-medium text-slate-500">{c.progressPct}%</span>
        </div>

        {canEdit && meta && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <label className="text-sm text-slate-500">Advance stage:</label>
            <select
              className="input max-w-xs"
              value={c.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
              disabled={statusMutation.isPending}
            >
              {meta.stages.map((s) => <option key={s.status} value={s.status}>{s.label}</option>)}
            </select>
            {statusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Documents */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Documents</h2>
            <AddDocumentControl onAdd={(cat) => addDoc.mutate(cat)} pending={addDoc.isPending} />
          </div>
          {uploadError && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{uploadError}</div>}
          {c.documents.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No documents yet.</p>
          ) : (
            <ul className="space-y-2">
              {c.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{doc.category}</p>
                      {doc.rejectionReason && <p className="text-xs text-rose-500">Rejected: {doc.rejectionReason}</p>}
                      {doc.versions.length > 0 && <p className="text-xs text-slate-400">v{doc.versions[0].version}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={docTone(doc.status)}>{doc.status.replaceAll('_', ' ')}</Badge>
                    {doc.fileUrl && (
                      <button title="View" onClick={() => viewFile(doc.id)} className="rounded-lg p-1 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40">
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {canUploadDocs && (
                      <>
                        <input
                          ref={(el) => { fileInputs.current[doc.id] = el; }}
                          type="file"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(doc.id, f); e.target.value = ''; }}
                        />
                        <button
                          title="Upload file"
                          onClick={() => fileInputs.current[doc.id]?.click()}
                          disabled={uploadBusyId === doc.id}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                        >
                          {uploadBusyId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        </button>
                      </>
                    )}
                    {canApproveDocs && doc.status !== 'VERIFIED' && (
                      <button
                        title="Verify"
                        onClick={() => updateDoc.mutate({ documentId: doc.id, status: 'VERIFIED' })}
                        className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    {canApproveDocs && doc.status !== 'REJECTED' && (
                      <button
                        title="Reject"
                        onClick={() => {
                          const reason = window.prompt('Rejection reason?') ?? undefined;
                          if (reason) updateDoc.mutate({ documentId: doc.id, status: 'REJECTED', rejectionReason: reason });
                        }}
                        className="rounded-lg p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Authority + follow-ups */}
        <div className="space-y-5">
          <div className="card">
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Authority</h2>
            {c.authorityTracking ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <Badge tone="blue">{c.authorityTracking.status.replaceAll('_', ' ')}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{c.authorityTracking.referenceNumber ?? '—'}</span>
                </div>
                {canEdit && (
                  <AuthorityUpdateControl
                    current={c.authorityTracking.status}
                    onUpdate={(v) => updateAuthority.mutate(v)}
                    pending={updateAuthority.isPending}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No authority tracking.</p>
            )}
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Follow-ups</h2>
              {canEdit && (
                <button
                  className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                  onClick={() => {
                    const notes = window.prompt('Follow-up note (e.g. called authority):') ?? undefined;
                    addFollowUp.mutate({ type: 'call', notes });
                  }}
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              )}
            </div>
            {!c.authorityTracking?.followUps.length ? (
              <p className="text-sm text-slate-400">No follow-ups logged.</p>
            ) : (
              <ul className="space-y-2">
                {c.authorityTracking.followUps.map((f) => (
                  <li key={f.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                    <div className="flex items-start gap-2">
                      {f.completedAt ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> : <Clock className="mt-0.5 h-4 w-4 text-amber-500" />}
                      <div>
                        <p className="font-medium capitalize text-slate-800 dark:text-slate-200">{f.type}</p>
                        {f.notes && <p className="text-xs text-slate-500">{f.notes}</p>}
                      </div>
                    </div>
                    {!f.completedAt && canEdit && (
                      <button onClick={() => completeFollowUp.mutate(f.id)} className="text-xs text-brand-600 hover:underline">Done</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddDocumentControl({ onAdd, pending }: { onAdd: (category: string) => void; pending: boolean }) {
  const { data } = useQuery({ queryKey: ['case-meta-docs'], queryFn: async () => (await api.get<{ documentCategories: string[] }>('/consultancy/meta')).data });
  const [cat, setCat] = useState('');
  return (
    <div className="flex items-center gap-2">
      <select className="input max-w-[200px] py-1.5 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
        <option value="">Add document…</option>
        {data?.documentCategories.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <button
        className="btn-primary px-3 py-1.5 text-sm"
        disabled={!cat || pending}
        onClick={() => { if (cat) { onAdd(cat); setCat(''); } }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </button>
    </div>
  );
}

function AuthorityUpdateControl({ current, onUpdate, pending }: { current: string; onUpdate: (v: { status: string; referenceNumber?: string }) => void; pending: boolean }) {
  const statuses = ['NOT_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_DOCS_REQUESTED', 'ELIGIBILITY_ISSUED', 'EXAM_SCHEDULED', 'APPROVED', 'REJECTED', 'CLOSED'];
  const [status, setStatus] = useState(current);
  const [ref, setRef] = useState('');
  return (
    <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      <select className="input py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
        {statuses.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
      </select>
      <input className="input py-1.5 text-sm" placeholder="Reference number (optional)" value={ref} onChange={(e) => setRef(e.target.value)} />
      <button className="btn-primary w-full py-1.5 text-sm" disabled={pending} onClick={() => onUpdate({ status, referenceNumber: ref || undefined })}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Update authority
      </button>
    </div>
  );
}
