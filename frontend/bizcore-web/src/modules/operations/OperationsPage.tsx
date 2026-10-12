import { errorText } from './errors';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types';
import { configs, money, n, paths, s, type Resource, type Row } from './config';
import { Badge, button, Dialog, fieldClass, muted, panel, primary } from './ui';
import RecordForm from './RecordForm';
import ActionForm, { type Action } from './ActionForm';
type PageData = { items: Row[]; totalCount: number; totalPages: number };
export default function OperationsPage({ resource, mine = false, lowStock = false, vendor = false }: { resource: Resource; mine?: boolean; lowStock?: boolean; vendor?: boolean }) {
  // Routes use a key so forms, filters and request state never leak between modules.
  const config = configs[resource]; const user = useAuthStore(state => state.user);
  const management = [UserRole.Manager, UserRole.CompanyAdmin, UserRole.SuperAdmin].includes(user?.role as UserRole);
  const [params, setParams] = useSearchParams(); const parentId = params.get('parentId') || undefined;
  const [query, setQuery] = useState(''); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const [data, setData] = useState<PageData | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [revision, setRevision] = useState(0);
  const [edit, setEdit] = useState<Row | 'new' | null>(null); const [detail, setDetail] = useState<Row | null>(null); const [action, setAction] = useState<{ row: Row; action: Action } | null>(null); const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    async function load() { setLoading(true); setError('');
    api.get<PageData>(`/operations/${resource}`, { params: { search, status, page, parentId, mine, lowStock } }).then(({ data: result }) => { if (active) setData(result); }).catch(e => { if (active) setError(errorText(e)); }).finally(() => { if (active) setLoading(false); });
    }
    void load(); return () => { active = false; };
  }, [resource, search, status, page, parentId, mine, lowStock, revision]);
  const saved = () => { setEdit(null); setAction(null); setNotice('Changes saved.'); setRevision(v => v + 1); };
  const canCreate = !vendor && resource !== 'movements' && (management || resource === 'time-entries');
  function canEdit(row: Row) { return management && !vendor && resource !== 'time-entries' && resource !== 'movements' && (['products', 'suppliers', 'tasks'].includes(resource) || resource === 'projects' && row.status === 'Active' || row.status === 'Draft' || resource === 'expenses' && row.status === 'Recorded' && !row.orderId); }
  function actions(row: Row): Action[] {
    const status = s(row, 'status');
    if (vendor) return resource === 'orders' && status === 'Placed' ? [{ label: 'Acknowledge order', status: 'Acknowledged' }] : [];
    if (resource === 'tasks') return [...['Todo', 'InProgress', 'Done'].filter(v => v !== status).map(v => ({ label: v === 'Todo' ? 'Move to to do' : v === 'Done' ? 'Mark done' : 'Start task', status: v })), { label: 'Log time', kind: 'time' }];
    if (resource === 'time-entries') return [{ label: 'Remove time log', kind: 'delete' }];
    if (!management) return [];
    if (resource === 'projects') return ['Active', 'Completed', 'Archived'].filter(v => v !== status).map(v => ({ label: v === 'Active' ? 'Reopen project' : v === 'Completed' ? 'Complete project' : 'Archive project', status: v }));
    if (resource === 'products') return row.isActive ? [{ label: 'Adjust stock', kind: 'stock' }] : [];
    if (resource === 'contracts') return status === 'Draft' ? [{ label: 'Activate contract', status: 'Active' }] : ['Active', 'Expired'].includes(status) ? [{ label: 'End contract', status: 'Ended' }] : [];
    if (resource === 'orders') return [...(status === 'Draft' ? [{ label: 'Place order', status: 'Placed' }] : []), ...(['Placed', 'Acknowledged'].includes(status) ? [{ label: 'Receive order', status: 'Received' }] : []), ...(['Draft', 'Placed', 'Acknowledged'].includes(status) ? [{ label: 'Cancel order', status: 'Cancelled' }] : [])];
    if (resource === 'invoices') return [...(status === 'Draft' ? [{ label: 'Issue invoice', status: 'Issued' }] : []), ...(['Issued', 'PartPaid'].includes(status) ? [{ label: 'Record payment', kind: 'payment' as const }] : []), ...(['Draft', 'Issued'].includes(status) ? [{ label: 'Void invoice', status: 'Voided' }] : [])];
    if (resource === 'expenses' && status === 'Recorded') return [{ label: 'Mark paid', status: 'Paid' }, { label: 'Void expense', status: 'Voided' }];
    return [];
  }
  function cell(row: Row, key: string) {
    if (key === 'progress') return `${n(row, 'completedTasks')} / ${n(row, 'taskCount')}`;
    if (key === 'status') return <Badge value={s(row, key)} />;
    if (key === 'isActive') return <Badge value={row[key] ? 'Yes' : 'No'} />;
    if (['total', 'paid', 'amount', 'unitCost', 'value'].includes(key)) return money(n(row, key));
    if (key === 'createdAt') return s(row, key).slice(0, 16).replace('T', ' ');
    return s(row, key) || '—';
  }
  const title = vendor ? `Your ${config.title.toLowerCase()}` : lowStock ? 'Stock alerts' : mine ? 'My tasks' : config.title;
  return <div className="mx-auto max-w-7xl space-y-6 text-gray-900 dark:text-slate-100">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">{vendor ? 'Vendor workspace' : 'Business operations'}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1><p className={`mt-2 max-w-2xl ${muted}`}>{vendor ? 'Only records shared with your linked supplier account are shown.' : lowStock ? 'Active products at or below their reorder threshold.' : config.intro}</p></div>{canCreate && <button className={primary} onClick={() => setEdit('new')}>+ New {config.singular}</button>}</header>
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">{notice}</p>}
    <section className={panel}><form onSubmit={e => { e.preventDefault(); setSearch(query.trim()); setPage(1); }} className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 space-y-2"><span className="text-sm font-medium">Search {config.title.toLowerCase()}</span><input className={fieldClass} placeholder="Search records…" value={query} onChange={e => setQuery(e.target.value)} /></label>{config.statuses && <label className="space-y-2"><span className="block text-sm font-medium">Status</span><select className={fieldClass} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{config.statuses.map(v => <option key={v}>{v}</option>)}</select></label>}<button className={button}>Search</button><button className={button} type="button" onClick={() => setRevision(v => v + 1)}>Refresh</button></form>{parentId && <p className={`mt-3 ${muted}`}>Showing linked records. <button className="underline" onClick={() => { setParams({}); setPage(1); }}>Show all</button></p>}</section>
    {error ? <div role="alert" className={`${panel} text-red-600 dark:text-red-300`}>{error} <button className={button} onClick={() => setRevision(v => v + 1)}>Retry</button></div> : loading ? <p role="status" className={muted}>Loading {config.title.toLowerCase()}…</p> : !data?.items.length ? <section className={`${panel} py-14 text-center`}><h2 className="text-lg font-semibold">No {config.title.toLowerCase()} found</h2><p className={`mt-2 ${muted}`}>{search || status || parentId ? 'Try another search or clear the filters.' : vendor ? 'Ask your company contact to link your vendor account and share an order or contract.' : canCreate ? `Create your first ${config.singular} to get started.` : 'Records will appear here when they are available to your account.'}</p></section> : <>
      <div className="space-y-3">{data.items.map(row => <article key={row.id} className={panel} aria-label={s(row, config.columns[0][0]) || config.singular}><div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">{config.columns.map(([key, label], i) => <div key={key} className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</p><div className={`mt-1 break-words ${i === 0 ? 'font-semibold text-base' : 'text-sm'}`}>{cell(row, key)}</div></div>)}</div>{resource === 'products' && !!row.isActive && n(row, 'onHand') <= n(row, 'reorderLevel') && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">Reorder needed · {s(row, 'unit')}</p>}{resource === 'expenses' && !!row.orderId && <p className={`mt-3 ${muted}`}>Created from a received purchase order</p>}<div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-slate-800"><button className={button} onClick={() => setDetail(row)}>Details</button>{canEdit(row) && <button className={button} onClick={() => setEdit(row)}>Edit</button>}{actions(row).map(a => <button key={a.label} className={button} onClick={() => setAction({ row, action: a })}>{a.label}</button>)}{resource === 'projects' && <Link className={button} to={`${paths.tasks}?parentId=${row.id}`}>View tasks →</Link>}{resource === 'products' && <Link className={button} to={`${paths.movements}?parentId=${row.id}`}>Stock history →</Link>}{resource === 'suppliers' && !vendor && <Link className={button} to={`${paths.orders}?parentId=${row.id}`}>Purchase orders →</Link>}</div></article>)}</div>
      <footer className="flex flex-wrap items-center justify-between gap-3"><p className={muted}>{data.totalCount} records · Page {page} of {Math.max(1, data.totalPages)}</p><div className="flex gap-2"><button className={button} disabled={page <= 1} onClick={() => setPage(v => v - 1)}>Previous</button><button className={button} disabled={page >= data.totalPages} onClick={() => setPage(v => v + 1)}>Next</button></div></footer>
    </>}
    {edit && <RecordForm resource={resource} row={edit === 'new' ? undefined : edit} defaults={parentId && resource === 'tasks' ? { projectId: parentId } : undefined} close={() => setEdit(null)} saved={saved} />}
    {action && <ActionForm resource={resource} {...action} close={() => setAction(null)} saved={saved} />}
    {detail && <Dialog title={`${config.singular[0].toUpperCase() + config.singular.slice(1)} details`} close={() => setDetail(null)}><dl className="grid gap-4 sm:grid-cols-2">{[...config.columns, ...config.fields.filter(f => f.type !== 'lookup' && !config.columns.some(([k]) => k === f.key)).map(f => [f.key, f.label])].map(([key, label]) => <div key={key} className="min-w-0"><dt className={muted}>{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{cell(detail, key)}</dd></div>)}</dl>{Array.isArray(detail.lines) && <section className="mt-6 space-y-3"><h3 className="font-semibold">Line items</h3>{(detail.lines as Record<string, unknown>[]).map((line, i) => <div key={i} className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800"><p className="break-words font-medium">{s(line, 'description') || s(line, 'productName')}</p><p className={muted}>{n(line, 'quantity')} × {money(n(line, resource === 'orders' ? 'unitCost' : 'unitPrice'))}</p></div>)}</section>}{Array.isArray(detail.payments) && <section className="mt-6 space-y-3"><h3 className="font-semibold">Recorded payments</h3>{!detail.payments.length && <p className={muted}>No payments recorded.</p>}{(detail.payments as Record<string, unknown>[]).map((payment, i) => <p key={i} className="break-words text-sm">{s(payment, 'date')} · {money(n(payment, 'amount'))} · {s(payment, 'reference')}</p>)}</section>}</Dialog>}
  </div>;
}
