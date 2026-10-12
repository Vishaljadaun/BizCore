import { errorText } from './errors';
import { useState, type FormEvent } from 'react';
import api from '../../api/axiosClient';
import { money, n, today, type Field, type Resource, type Row } from './config';
import { button, Dialog, FieldInput, muted, primary } from './ui';
export type Action = { label: string; status?: string; kind?: 'stock' | 'payment' | 'delete' | 'time' };
export default function ActionForm({ resource, row, action, close, saved }: { resource: Resource; row: Row; action: Action; close: () => void; saved: () => void }) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState<Record<string, unknown>>({ date: today(), amount: n(row, 'total') - n(row, 'paid'), delta: 1, reason: '', reference: '', minutes: 30, note: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const fields: Field[] = action.kind === 'stock' ? [ { key: 'delta', label: 'Stock change (negative to remove)', type: 'number', required: true, min: -1000000, max: 1000000, step: '1' }, { key: 'reason', label: 'Reason', required: true, max: 500 } ] : action.kind === 'payment' ? [ { key: 'amount', label: 'Amount received (INR)', type: 'number', required: true, min: 0.01, max: n(row, 'total') - n(row, 'paid'), step: '0.01' }, { key: 'date', label: 'Payment date', type: 'date', required: true }, { key: 'reference', label: 'Payment reference', required: true, max: 200 } ] : action.kind === 'time' ? [ { key: 'date', label: 'Date', type: 'date', required: true }, { key: 'minutes', label: 'Minutes', type: 'number', min: 1, max: 1440, step: '1', required: true }, { key: 'note', label: 'Note', type: 'textarea', max: 1000 } ] : resource === 'expenses' && action.status === 'Paid' ? [{ key: 'date', label: 'Payment date', type: 'date', required: true }] : [];
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    const data = Object.fromEntries(fields.map(f => [f.key, f.type === 'number' ? Number(values[f.key]) : values[f.key]]));
    try {
      const url = `/operations/${resource}/${row.id}`;
      if (action.kind === 'stock') await api.post(`${url}/stock`, { ...data, requestId });
      else if (action.kind === 'payment') await api.post(`${url}/payments`, { ...data, requestId });
      else if (action.kind === 'time') await api.post('/operations/time-entries', { ...data, taskId: row.id });
      else if (action.kind === 'delete') await api.delete(url);
      else await api.put(`${url}/status`, { status: action.status, ...data });
      saved();
    } catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
  }
  const help = action.status === 'Received' ? 'Confirm that all items have arrived. This adds the ordered quantities to stock and creates one unpaid inventory expense. This action cannot be undone here.' : action.kind === 'payment' ? `Record a payment you have already received. Outstanding balance: ${money(n(row, 'total') - n(row, 'paid'))}. This does not charge the customer.` : action.kind === 'stock' ? 'Enter the quantity to add or remove, with a reason. Each adjustment is recorded in stock history.' : action.kind === 'delete' ? 'This removes the selected time entry. Its removal is recorded in the audit log.' : `Apply “${action.label}” to this record?`;
  return <Dialog title={action.label} close={close} busy={busy}><form className="space-y-5" onSubmit={submit}><p className={muted}>{help}</p><fieldset disabled={busy} className="space-y-4">{fields.map(f => <FieldInput key={f.key} field={f} value={values[f.key]} change={v => setValues(old => ({ ...old, [f.key]: v }))} />)}</fieldset>{error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}<div className="flex justify-end gap-3"><button type="button" className={button} disabled={busy} onClick={close}>Cancel</button><button className={primary} disabled={busy}>{busy ? 'Saving…' : 'Confirm'}</button></div></form></Dialog>;
}
