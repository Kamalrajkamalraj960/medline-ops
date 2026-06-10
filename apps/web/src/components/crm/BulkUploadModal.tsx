'use client';

import { useRef, useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LEAD_PRIORITIES, LEAD_SERVICES, LEAD_STAGES } from './types';
import type { Lead, LeadPriority, LeadService, LeadStage } from './types';

type NewLead = Omit<Lead, 'id' | 'leadId' | 'createdAt'>;

interface BulkUploadModalProps {
  onClose: () => void;
  onImport: (leads: NewLead[]) => void;
}

const TEMPLATE_HEADERS = 'name,phone,profession,service,stage,priority,assignedTo';

/** Maps a loose string onto a known enum value, falling back to a default. */
function coerce<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  const match = allowed.find((a) => a.toLowerCase() === (value ?? '').trim().toLowerCase());
  return match ?? fallback;
}

function parseCsv(text: string): NewLead[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  // Drop the header row if it looks like one.
  const startsWithHeader = /name/i.test(lines[0]) && /phone/i.test(lines[0]);
  const rows = startsWithHeader ? lines.slice(1) : lines;

  return rows
    .map((row) => row.split(','))
    .filter((cols) => cols[0]?.trim() && cols[1]?.trim())
    .map((cols) => ({
      name: cols[0].trim(),
      phone: cols[1].trim(),
      profession: cols[2]?.trim() || '—',
      service: coerce<LeadService>(cols[3], LEAD_SERVICES, LEAD_SERVICES[0]),
      stage: coerce<LeadStage>(cols[4], LEAD_STAGES, 'New'),
      priority: coerce<LeadPriority>(cols[5], LEAD_PRIORITIES, 'Medium'),
      assignedTo: cols[6]?.trim() || 'Unassigned',
    }));
}

export function BulkUploadModal({ onClose, onImport }: BulkUploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | null) {
    setError(null);
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) {
      setError('Please choose a .csv file.');
      return;
    }
    setFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      const text = await file.text();
      const leads = parseCsv(text);
      if (leads.length === 0) {
        setError('No valid rows found. Expected columns: ' + TEMPLATE_HEADERS);
        setParsing(false);
        return;
      }
      onImport(leads);
    } catch {
      setError('Could not read the file. Please try again.');
      setParsing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300">
              <UploadCloud className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bulk Upload Leads</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pick(e.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition',
            dragOver
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-600/10'
              : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40',
          )}
        >
          {file ? (
            <>
              <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB · click to replace</p>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Drop your CSV here, or <span className="text-brand-600 dark:text-brand-400">browse</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">CSV up to a few thousand rows</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* Template hint */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-600 dark:bg-slate-800/40 dark:text-slate-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-200">Expected columns</p>
            <code className="mt-0.5 block font-mono text-[11px] text-slate-500 dark:text-slate-400">{TEMPLATE_HEADERS}</code>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button type="button" onClick={handleImport} disabled={!file || parsing} className="btn-primary flex-1">
            {parsing && <Loader2 className="h-4 w-4 animate-spin" />}
            Import Leads
          </button>
        </div>
      </div>
    </div>
  );
}
