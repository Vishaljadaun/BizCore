import { errorMessage } from './leaveErrors';
import { useEffect, useState, type FormEvent } from 'react';
import { hrApi } from '../../../api/hrApi';
import { useAuthStore } from '../../../store/authStore';
import { UserRole, type LeaveRequestResponse, type LeaveTypeResponse, type PaginatedResponse } from '../../../types';
import Button from '../../../components/shared/Button';
import Input from '../../../components/shared/Input';
import { panel, field, muted, RequestDetails, Pagination } from './leaveUi';

export default function LeaveManagementPage() {
  const user = useAuthStore(state => state.user);
  const canSetPolicy = user?.role === UserRole.CompanyAdmin || user?.role === UserRole.SuperAdmin;
  const [data, setData] = useState<PaginatedResponse<LeaveRequestResponse> | null>(null);
  const [types, setTypes] = useState<LeaveTypeResponse[]>([]);
  const [status, setStatus] = useState('Pending');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [name, setName] = useState('');
  const [daysAllowed, setDaysAllowed] = useState('12');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const [requests, policies] = await Promise.all([
          hrApi.getLeaveRequests({ status: status || undefined, page, pageSize: 10 }), hrApi.getLeaveTypes(),
        ]);
        if (active) { setData(requests); setTypes(policies); }
      } catch (failure) { if (active) setError(errorMessage(failure, 'Unable to load leave management. Please retry.')); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [status, page, revision]);

  async function decide(id: string, approve: boolean) {
    setBusy(true); setError(''); setNotice('');
    try {
      if (approve) await hrApi.approveLeave(id); else await hrApi.rejectLeave(id, rejectionReason);
      setRejectId(null); setRejectionReason(''); setPage(1); setRevision(value => value + 1);
      setNotice(approve ? 'Leave approved and balance updated.' : 'Leave rejected. Reserved days are available again.');
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function createPolicy(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await hrApi.createLeaveType({ name, daysAllowed: Number(daysAllowed) });
      setName(''); setRevision(value => value + 1); setNotice('Leave policy added for all employees.');
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-6 text-gray-900 dark:text-slate-100">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">People operations</p><h1 className="mt-2 text-2xl font-bold">Leave Management</h1><p className={`mt-1 ${muted}`}>Review time off and keep your team's availability clear.</p></div>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-300">{error} <Button variant="ghost" onClick={() => setRevision(value => value + 1)}>Retry</Button></div>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">{notice}</p>}
    <div className="grid items-start gap-6 lg:grid-cols-3">
      <section className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Requests{!loading && data ? ` (${data.totalCount})` : ''}</h2><div className={`flex items-center gap-2 ${muted}`}><label htmlFor="request-status">Status</label><select id="request-status" className={field} value={status} onChange={e => { setStatus(e.target.value); setPage(1); setRejectId(null); }}><option value="">All statuses</option>{['Pending', 'Approved', 'Rejected', 'Cancelled'].map(value => <option key={value}>{value}</option>)}</select></div></div>
        {loading ? <p role="status" className={muted}>Loading requests…</p> : <>
          {data?.items.length === 0 && <div className={`${panel} py-12 text-center`}><h3 className="font-semibold">You're all caught up</h3><p className={`mt-2 ${muted}`}>No requests match this status. Employee requests will appear here.</p></div>}
          {data?.items.map(request => <article className={panel} key={request.id}>
            <p className="mb-3 text-sm font-semibold text-primary-600 dark:text-primary-400">{request.employeeName}</p><RequestDetails request={request} />
            {request.status === 'Pending' && <div className="mt-4">
              {rejectId === request.id ? <form className="space-y-3" onSubmit={e => { e.preventDefault(); void decide(request.id, false); }}><label htmlFor={`reject-${request.id}`} className="block text-sm font-medium">Rejection reason</label><textarea id={`reject-${request.id}`} className={field} required maxLength={500} rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} /><div className="flex flex-wrap gap-2"><Button type="submit" variant="danger" isLoading={busy}>Confirm rejection</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => setRejectId(null)}>Keep pending</Button></div></form> : <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void decide(request.id, true)}>Approve</Button><Button disabled={busy} variant="secondary" onClick={() => { setRejectId(request.id); setRejectionReason(''); }}>Reject</Button></div>}
            </div>}
          </article>)}
          {data && <Pagination data={data} page={page} onChange={setPage} disabled={busy || loading} />}
        </>}
      </section>
      <aside className={`${panel} space-y-5`}>
        <div><h2 className="text-lg font-semibold">Leave policies</h2><p className={`mt-2 ${muted}`}>Annual allowances apply to each employee. Weekends are excluded; public holidays, carryover, and half days are not supported yet.</p></div>
        {types.length === 0 && !loading && <p className={muted}>No policies yet.{canSetPolicy ? ' Add your first policy below.' : ' Ask an administrator to add one.'}</p>}
        <ul className="space-y-3">{types.map(type => <li key={type.id} className="flex justify-between gap-3 border-b border-gray-100 pb-3 text-sm dark:border-slate-800"><span className="break-words">{type.name}</span><span className="shrink-0 font-semibold">{type.daysAllowed} days / year</span></li>)}</ul>
        {canSetPolicy && <form className="space-y-4" onSubmit={createPolicy}><h3 className="font-semibold">Add a policy</h3><Input label="Policy name" required maxLength={50} placeholder="e.g. Annual leave" value={name} onChange={e => setName(e.target.value)} /><Input label="Days per year" type="number" required min={1} max={366} value={daysAllowed} onChange={e => setDaysAllowed(e.target.value)} /><Button type="submit" fullWidth isLoading={busy}>Add policy</Button></form>}
        <p className="rounded-xl bg-primary-50 p-3 text-xs leading-relaxed text-primary-800 dark:bg-primary-900/20 dark:text-primary-300">Reviews are recorded under your signed-in account. You cannot review your own leave request.</p>
      </aside>
    </div>
  </div>;
}
