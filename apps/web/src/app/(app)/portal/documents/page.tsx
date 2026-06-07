'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FileText, Loader2, Upload } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { Badge, PageHeader } from '@/components/ui';
import type { PortalDocument } from '@/lib/types';

const tone = (s: string): 'green' | 'amber' | 'rose' | 'slate' | 'blue' =>
  s === 'VERIFIED' ? 'green' : s === 'REJECTED' ? 'rose' : s === 'MISSING' ? 'slate' : 'amber';

const canUpload = (s: string) => s === 'MISSING' || s === 'REJECTED' || s === 'RESUBMISSION_REQUIRED';

export default function PortalDocumentsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['portal-documents'], queryFn: async () => (await api.get<PortalDocument[]>('/portal/documents')).data });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  // Presigned-upload flow: ask the API for a PUT URL, send the file straight to
  // S3 (no auth header — the signature authorizes it), then record the key.
  async function handleFile(documentId: string, file: File) {
    setError(null);
    setBusyId(documentId);
    try {
      const contentType = file.type || 'application/octet-stream';
      const { data: presign } = await api.post(`/portal/documents/${documentId}/presign`, { fileName: file.name, contentType });
      const put = await fetch(presign.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      await api.post(`/portal/documents/${documentId}/upload`, { fileUrl: presign.key });
      await qc.invalidateQueries({ queryKey: ['portal-documents'] });
      await qc.invalidateQueries({ queryKey: ['portal-overview'] });
    } catch (e) {
      setError(apiErrorMessage(e, 'Upload failed'));
    } finally {
      setBusyId(null);
    }
  }

  async function view(documentId: string) {
    try {
      const { data: dl } = await api.get<{ url: string }>(`/portal/documents/${documentId}/download`);
      window.open(dl.url, '_blank', 'noopener');
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not open document'));
    }
  }

  return (
    <div>
      <PageHeader title="My Documents" subtitle="Upload and track verification status" />
      {error && <div className="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}
      <div className="card">
        {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No documents requested yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{doc.category}</p>
                    {doc.status === 'REJECTED' && doc.rejectionReason && (
                      <p className="text-xs text-rose-500">Rejected: {doc.rejectionReason}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={tone(doc.status)}>{doc.status.replaceAll('_', ' ')}</Badge>
                  {doc.fileUrl && (
                    <button onClick={() => view(doc.id)} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"><Eye className="h-3.5 w-3.5" /> View</button>
                  )}
                  {canUpload(doc.status) && (
                    <>
                      <input
                        ref={(el) => { inputs.current[doc.id] = el; }}
                        type="file"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(doc.id, f); e.target.value = ''; }}
                      />
                      <button
                        onClick={() => inputs.current[doc.id]?.click()}
                        disabled={busyId === doc.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        {busyId === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-slate-400">Verified documents are locked. Rejected documents can be re-uploaded. Files are stored securely and accessed via expiring links.</p>
      </div>
    </div>
  );
}
