import { errorMessage } from './leaveErrors';
import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { hrApi } from '../../../api/hrApi';
import type { EmployeeResponse, LeaveBalanceResponse, LeaveRequestResponse, PaginatedResponse } from '../../../types';
import Button from '../../../components/shared/Button';
import Input from '../../../components/shared/Input';
import { panel, field, muted, RequestDetails, Pagination } from './leaveUi';

export default function MyLeavePage() {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [balances, setBalances] = useState<LeaveBalanceResponse[]>([]);
  const [requests, setRequests] = useState<PaginatedResponse<LeaveRequestResponse> | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [missingProfile, setMissingProfile] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError(''); setMissingProfile(false);
      try {
        const profile = await hrApi.getMyProfile();
        const [balanceData, history] = await Promise.all([
          hrApi.getLeaveBalances(profile.id, year),
          hrApi.getLeaveRequests({ employeeId: profile.id, page, pageSize: 10 }),
        ]);
        if (active) { setEmployee(profile); setBalances(balanceData); setRequests(history); }
      } catch (failure) {
        if (active) {
          if (isAxiosError(failure) && failure.response?.status === 404) setMissingProfile(true);
          else setError(errorMessage(failure, 'Unable to load your leave. Please retry.'));
        }
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [year, page, revision]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!employee) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await hrApi.applyLeave(employee.id, { leaveTypeId, startDate, endDate, reason });
      setReason(''); setPage(1); setRevision(value => value + 1);
      setNotice('Request sent. Your available balance is reserved until it is reviewed or cancelled.');
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function cancel(id: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      await hrApi.cancelLeave(id); setRevision(value => value + 1);
      setNotice('Request cancelled. Reserved days are available again.');
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl space-y-6 text-gray-900 dark:text-slate-100">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">Employee workspace</p>
      <h1 className="mt-2 text-2xl font-bold">My Leave</h1><p className={`mt-1 ${muted}`}>Plan time away, track requests, and see the days you can use.</p></div>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-300">{error} <Button variant="ghost" onClick={() => setRevision(value => value + 1)}>Retry</Button></div>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">{notice}</p>}
    {loading ? <p role="status" className={muted}>Loading your leave…</p> : missingProfile ? <section className={panel}>
      <h2 className="font-semibold">No employee profile linked</h2><p className={`mt-2 ${muted}`}>Ask your company administrator to link your account to an employee record before applying for leave.</p>
      <Link to="/my-profile" className="mt-3 inline-block text-primary-600 dark:text-primary-400">View my profile →</Link>
    </section> : employee && <>
      <section aria-label="Leave balances" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Your balance</h2>
          <label className={`flex items-center gap-2 ${muted}`}>Balance year<select className={field} value={year} onChange={e => setYear(Number(e.target.value))}><option>{currentYear}</option><option>{currentYear + 1}</option></select></label></div>
        {balances.length === 0 ? <p className={panel}>Your administrator needs to add a leave policy before you can apply.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{balances.map(balance => <div key={balance.leaveTypeId} className={panel}>
          <p className="font-medium">{balance.leaveTypeName}</p><p className="mt-3 text-3xl font-bold text-primary-600 dark:text-primary-400">{balance.availableDays ?? balance.remainingDays}<span className={`ml-2 font-normal ${muted}`}>available</span></p>
          <p className={`mt-2 ${muted}`}>{balance.usedDays} used · {balance.pendingDays ?? 0} pending · {balance.totalDays} total</p>
        </div>)}</div>}
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-5">
        <section className={`${panel} lg:col-span-2`}><h2 className="text-lg font-semibold">Request time off</h2>
          <p className={`mt-2 ${muted}`}>Monday–Friday, whole days only. Public holidays are counted. Requests must stay within one calendar year; pending requests reserve your balance.</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div><label htmlFor="leave-type" className="mb-1 block text-sm font-medium">Leave type</label><select id="leave-type" required className={field} value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)}><option value="">Select a leave type</option>{balances.map(balance => <option key={balance.leaveTypeId} value={balance.leaveTypeId}>{balance.leaveTypeName}</option>)}</select></div>
            <Input label="Start date" type="date" required min={today} max={`${currentYear + 1}-12-31`} value={startDate} onChange={e => { setStartDate(e.target.value); if (e.target.value) setYear(Number(e.target.value.slice(0, 4))); }} />
            <Input label="End date" type="date" required min={startDate || today} max={`${currentYear + 1}-12-31`} value={endDate} onChange={e => setEndDate(e.target.value)} />
            <div><label htmlFor="leave-reason" className="mb-1 block text-sm font-medium">Reason</label><textarea id="leave-reason" required maxLength={500} rows={3} className={field} value={reason} onChange={e => setReason(e.target.value)} /></div>
            <Button type="submit" fullWidth isLoading={busy} disabled={balances.length === 0}>Submit request</Button>
          </form>
        </section>
        <section className="space-y-4 lg:col-span-3"><h2 className="text-lg font-semibold">Request history · all years</h2>
          {requests?.items.length === 0 && <p className={`${panel} ${muted}`}>No requests yet. Your first request will appear here.</p>}
          {requests?.items.map(request => <article key={request.id} className={panel}><RequestDetails request={request} />{request.status === 'Pending' && <Button className="mt-4" variant="secondary" disabled={busy} onClick={() => void cancel(request.id)}>Cancel request</Button>}</article>)}
          {requests && <Pagination data={requests} page={page} onChange={setPage} disabled={busy || loading} />}
        </section>
      </div>
    </>}
  </div>;
}
