import { errorText } from './errors';
import { useState, type FormEvent } from 'react';
import api from '../../api/axiosClient';
import { configs, money, n, type Field, type Resource, type Row } from './config';
import { button, Dialog, FieldInput, muted, panel, primary } from './ui';
export default function RecordForm({ resource, row, defaults, close, saved }: { resource: Resource; row?: Row; defaults?: Record<string, unknown>; close: () => void; saved: () => void }) {
  const config = configs[resource];
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(config.fields.map(f => [f.key, row?.[f.key] ?? defaults?.[f.key] ?? f.initial ?? ''])));
  const emptyLine = () => config.lines === 'order' ? { productId: '', quantity: 1, unitCost: 0 } : { description: '', quantity: 1, unitPrice: 0 };
  const [lines, setLines] = useState<Record<string, unknown>[]>(() => Array.isArray(row?.lines) ? row.lines : [emptyLine()]);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const lineFields: Field[] = config.lines === 'order' ? [{ key: 'productId', label: 'Product', type: 'lookup', source: 'products', required: true }, { key: 'quantity', label: 'Quantity', type: 'number', min: 1, max: 1000000, step: '1', required: true }, { key: 'unitCost', label: 'Unit cost (INR)', type: 'number', min: 0, max: 1000000000, step: '0.01', required: true }] : [{ key: 'description', label: 'Item description', max: 300, required: true }, { key: 'quantity', label: 'Quantity', type: 'number', min: 0.01, max: 1000000, step: '0.01', required: true }, { key: 'unitPrice', label: 'Unit price (INR)', type: 'number', min: 0, max: 1000000000, step: '0.01', required: true }];
  const subtotal = lines.reduce((sum, l) => sum + Math.round(n(l, 'quantity') * n(l, config.lines === 'order' ? 'unitCost' : 'unitPrice') * 100) / 100, 0);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    const body = Object.fromEntries(config.fields.map(f => [f.key, f.type === 'number' ? Number(values[f.key]) : (f.type === 'lookup' || f.type === 'date') && !values[f.key] ? null : values[f.key]]));
    if (config.lines) body.lines = lines.map(l => Object.fromEntries(lineFields.map(f => [f.key, f.type === 'number' ? Number(l[f.key]) : l[f.key]])));
    try { if (row) await api.put(`/operations/${resource}/${row.id}`, body); else await api.post(`/operations/${resource}`, body); saved(); }
    catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
  }
  return <Dialog title={`${row ? 'Edit' : 'New'} ${config.singular}`} close={close} busy={busy}><form onSubmit={submit} className="space-y-5"><fieldset disabled={busy} className="space-y-5">{config.fields.map(f => <FieldInput key={f.key} field={f} value={values[f.key]} change={v => setValues(old => ({ ...old, [f.key]: v }))} />)}
    {resource === 'suppliers' && <p className={muted}>To enable the portal, first create a user with the Vendor role in User Management, then link that account here.</p>}
    {config.lines && <section className="space-y-4"><h3 className="font-semibold">Line items</h3>{lines.map((line, i) => <fieldset key={i} className={`${panel} space-y-3`}><legend className="px-2 text-sm font-semibold">Item {i + 1}</legend>{lineFields.map(f => <FieldInput key={f.key} field={f} value={line[f.key]} change={v => setLines(old => old.map((l, index) => index === i ? { ...l, [f.key]: v } : l))} />)}<button type="button" className={button} disabled={lines.length === 1} onClick={() => setLines(old => old.filter((_, index) => index !== i))}>Remove item {i + 1}</button></fieldset>)}<button type="button" className={button} disabled={lines.length >= 100} onClick={() => setLines(old => [...old, emptyLine()])}>Add line item</button><p className="text-right font-semibold">Estimated total: {money(subtotal * (1 + (config.lines === 'invoice' ? n(values, 'taxPercent') : 0) / 100))}</p></section>}
    </fieldset>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}<div className="flex justify-end gap-3"><button type="button" className={button} disabled={busy} onClick={close}>Cancel</button><button className={primary} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div></form></Dialog>;
}
