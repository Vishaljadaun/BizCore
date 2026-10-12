import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { errorText } from './errors';
import api from '../../api/axiosClient';
import type { Field, Row } from './config';
import { s } from './config';
export const panel = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
export const fieldClass = 'w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
export const muted = 'text-sm text-gray-500 dark:text-slate-400';
export const button = 'inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:hover:bg-slate-800';
export const primary = button + ' border-transparent bg-primary-600 text-white hover:bg-primary-700 dark:hover:bg-primary-700';
export function Badge({ value }: { value: string }) {
  const green = ['Active', 'Done', 'Paid', 'Received', 'Completed', 'Yes'].includes(value);
  const grey = ['Archived', 'Cancelled', 'Voided', 'Ended', 'No'].includes(value);
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${green ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : grey ? 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400' : 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300'}`}>{value.replace(/([a-z])([A-Z])/g, '$1 $2')}</span>;
}
export function Dialog({ title, children, close, busy = false }: { title: string; children: ReactNode; close: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => { const el = ref.current; const previous = document.activeElement as HTMLElement; el?.showModal(); return () => { el?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} aria-labelledby={id} onCancel={e => { e.preventDefault(); if (!busy) close(); }} className="w-[calc(100%-2rem)] max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-slate-950/70 dark:bg-slate-900 dark:text-slate-100"><div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h2 id={id} className="text-xl font-bold">{title}</h2><button className={button} onClick={close} disabled={busy} type="button" aria-label="Close dialog">✕</button></div><div className="p-5">{children}</div></dialog>;
}
export function Lookup({ field, value, change }: { field: Field; value: string; change: (v: string) => void }) {
  const [search, setSearch] = useState(''); const [rows, setRows] = useState<Row[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const id = useId();
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      api.get(`/operations/${field.source}`, { params: { search, pageSize: 100 } }).then(({ data }) => {
        if (!active) return;
        const all: Row[] = Array.isArray(data) ? data : data.items;
        setRows(all.filter(r => r.isActive !== false && (!field.role || r.role === field.role) && (field.key !== 'assignedUserId' || r.role !== 'Vendor') && (field.source !== 'projects' || r.status === 'Active')));
      }).catch(e => { if (active) setError(errorText(e)); }).finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [search, field.source, field.role, field.key]);
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium">{field.label}{field.required && ' *'}</label><input aria-label={`Search ${field.label.toLowerCase()}`} placeholder="Type to find a record…" className={fieldClass} value={search} onChange={e => setSearch(e.target.value)} /><select id={id} className={fieldClass} value={value} required={field.required} onChange={e => change(e.target.value)}><option value="">{field.required ? 'Choose a record' : 'None'}</option>{value && !rows.some(r => r.id === value) && <option value={value}>Selected record ({value.slice(0, 8)})</option>}{rows.map(r => <option key={r.id} value={r.id}>{s(r, 'name') || s(r, 'title') || s(r, 'number')}{r.email ? ` · ${r.email}` : ''}</option>)}</select>{loading && <p className={muted}>Loading choices…</p>}{error && <p role="alert" className="text-sm text-red-600">{error} Change the search to retry.</p>}{rows.length === 100 && <p className={muted}>Showing the first 100 matches. Narrow your search.</p>}</div>;
}
export function FieldInput({ field, value, change }: { field: Field; value: unknown; change: (v: unknown) => void }) {
  const id = useId();
  if (field.type === 'lookup') return <Lookup field={field} value={String(value ?? '')} change={change} />;
  if (field.type === 'checkbox') return <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(value)} onChange={e => change(e.target.checked)} />{field.label}</label>;
  const props = { id, className: fieldClass, required: field.required, value: String(value ?? ''), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => change(e.target.value) };
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium">{field.label}{field.required && ' *'}</label>{field.type === 'textarea' ? <textarea {...props} rows={3} maxLength={field.max} /> : field.type === 'select' ? <select {...props}>{field.choices?.map(v => <option key={v}>{v}</option>)}</select> : <input {...props} type={field.type || 'text'} min={field.type === 'number' ? field.min : undefined} max={field.type === 'number' ? field.max : undefined} maxLength={field.type !== 'number' ? field.max : undefined} step={field.step} />}</div>;
}
