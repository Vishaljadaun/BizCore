import { errorText } from './errors';
import { useEffect, useState } from 'react';
import api from '../../api/axiosClient';
import { money, n, today } from './config';
import { button, fieldClass, muted, panel, primary } from './ui';
export default function ReportsPage() {
  const [from, setFrom] = useState(today().slice(0, 7) + '-01'); const [to, setTo] = useState(today());
  const [range, setRange] = useState({ from, to }); const [data, setData] = useState<Record<string, unknown> | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [exporting, setExporting] = useState(false); const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() { setLoading(true); setError('');
    api.get('/operations/reports', { params: range }).then(({ data }) => { if (active) setData(data); }).catch(e => { if (active) setError(errorText(e)); }).finally(() => { if (active) setLoading(false); });
    }
    void load(); return () => { active = false; };
  }, [range, revision]);
  async function download() {
    setExporting(true); setError('');
    try { const response = await api.get('/operations/reports/export', { params: range, responseType: 'blob' }); const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = `cash-flow-${range.from}-${range.to}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (e) { setError(errorText(e)); } finally { setExporting(false); }
  }
  return <div className="mx-auto max-w-6xl space-y-6 text-gray-900 dark:text-slate-100"><header><p className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">Finance · INR</p><h1 className="mt-2 text-3xl font-bold">Cash-flow report</h1><p className={`mt-2 ${muted}`}>See recorded customer payments and paid expenses. Cash flow reflects money recorded as received or paid, not accounting profit.</p></header><form className={`${panel} flex flex-wrap items-end gap-3`} onSubmit={e => { e.preventDefault(); setRange({ from, to }); }}><label className="space-y-2"><span className="block text-sm font-medium">From</span><input className={fieldClass} type="date" required value={from} onChange={e => setFrom(e.target.value)} /></label><label className="space-y-2"><span className="block text-sm font-medium">To</span><input className={fieldClass} type="date" required min={from} value={to} onChange={e => setTo(e.target.value)} /></label><button className={primary}>Apply dates</button><button type="button" className={button} disabled={exporting || loading || !data} onClick={download}>{exporting ? 'Exporting…' : 'Export cash-flow CSV'}</button></form>{error && <div role="alert" className={`${panel} text-red-600 dark:text-red-300`}>{error} <button className={button} onClick={() => setRevision(v => v + 1)}>Retry</button></div>}{loading ? <p role="status" className={muted}>Loading report…</p> : data && !error && <><p className={muted}>Period: {range.from} to {range.to} · UTC dates</p><div className="grid gap-4 sm:grid-cols-2">{[['invoiced', 'Issued invoices'], ['received', 'Payments received'], ['paidExpenses', 'Expenses paid'], ['netCashFlow', 'Net cash flow']].map(([key, label]) => <section key={key} className={panel}><h2 className={muted}>{label}</h2><p className="mt-4 break-words text-3xl font-bold">{money(n(data, key))}</p></section>)}</div><h2 className="text-lg font-semibold">Outstanding now · all dates</h2><div className="grid gap-4 sm:grid-cols-2">{[['outstandingNow', 'Customer balances due'], ['unpaidExpensesNow', 'Unpaid expenses']].map(([key, label]) => <section key={key} className={panel}><h3 className={muted}>{label}</h3><p className="mt-3 text-2xl font-semibold">{money(n(data, key))}</p></section>)}</div></>}</div>;
}
