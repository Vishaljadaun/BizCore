import { errorMessage } from '../hr/leaves/leaveErrors';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hrApi } from '../../api/hrApi';
import { useAuthStore } from '../../store/authStore';
import { UserRole, type OverviewResponse } from '../../types';
import Button from '../../components/shared/Button';
import { panel, muted } from '../hr/leaves/leaveUi';

export default function CompanyAdminDashboard() {
  const user = useAuthStore(state => state.user);
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (user?.role === UserRole.Vendor) return;
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try { const result = await hrApi.getOverview(); if (active) setData(result); }
      catch (failure) { if (active) setError(errorMessage(failure, 'Unable to load the dashboard. Please retry.')); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [revision, user?.role]);
  if (user?.role === UserRole.Vendor) return <section className={panel}><h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Vendor portal · planned</h1><p className={`mt-2 ${muted}`}>The vendor module is not available yet. Contact your company administrator for help.</p></section>;
  const management = data?.scope === 'company';
  const cards = management ? [
    ['Active employees', data?.activeEmployees, 'People in your company'],
    ['Clock-ins today', data?.clockInsToday, 'Recorded attendance, UTC day'],
    ['Pending requests', data?.pendingRequests, 'Waiting for a leave decision'],
    ['On leave today', data?.onLeaveToday, 'Approved time off, weekdays'],
  ] : [
    ['Attendance this month', data?.attendanceDaysThisMonth, 'Days with a clock-in'],
    ['Pending requests', data?.pendingRequests, 'Your leave awaiting review'],
    ['Approved days this year', data?.approvedDaysThisYear, 'Includes upcoming leave'],
  ];
  return <div className="mx-auto max-w-6xl space-y-6 text-gray-900 dark:text-slate-100">
    <section className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white sm:p-8 dark:border dark:border-slate-700">
      <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl" />
      <div className="relative"><p className="text-xs font-semibold uppercase tracking-widest text-primary-300">{user?.companyName || 'Your workspace'}</p><h1 className="mt-3 text-2xl font-bold sm:text-3xl">Welcome back, {user?.firstName}.</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">A clear view of your people, attendance, and time off. Everything here comes from your company records.</p></div>
    </section>
    {error ? <div role="alert" className={`${panel} text-red-700 dark:text-red-300`}>{error} <Button className="ml-2" variant="secondary" onClick={() => setRevision(value => value + 1)}>Retry</Button></div> : loading ? <p role="status" className={muted}>Loading your workspace…</p> : data && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{management ? 'Company overview' : 'My overview'}</h2><span className={muted}>{data.date} · UTC</span></div>
      <section aria-label="Overview metrics" className={`grid gap-4 sm:grid-cols-2 ${management ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>{cards.map(([label, value, help]) => <div key={label} className={panel}><p className="text-sm font-medium">{label}</p><p className="mt-4 text-4xl font-bold tracking-tight">{value}</p><p className={`mt-3 ${muted}`}>{help}</p></div>)}</section>
      <div className="grid items-start gap-6 lg:grid-cols-3"><section className={`${panel} lg:col-span-2`}><h2 className="text-lg font-semibold">{management ? 'Keep work moving' : 'Your next step'}</h2><p className={`mt-2 ${muted}`}>{management ? `${data.departments} departments · Set up your team, review requests, and export attendance.` : data.hasEmployeeProfile ? 'Clock in from your profile or plan your next day off.' : 'Ask your administrator to link your account to an employee record to use attendance and leave.'}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{(management ? [
          ['/hr/employees', 'Manage employees', 'Create records and grant login access'],
          ['/hr/leaves', 'Review leave', 'Set policies and review requests'],
          ['/hr/attendance', 'View attendance', 'Check records and download CSV'],
          ['/my-profile', 'My profile', 'Your employee details and attendance'],
        ] : [['/my-profile', 'My profile', 'Clock in, clock out, and view your details'], ['/my-leave', 'My Leave', 'Available days and request history']]).map(([to, title, help]) => <Link key={to} to={to} className="rounded-xl border border-gray-200 p-4 transition hover:border-primary-400 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:hover:bg-slate-800"><span className="font-semibold">{title} →</span><p className={`mt-1 ${muted}`}>{help}</p></Link>)}</div>
      </section><aside className={panel}><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-300">Project roadmap</span><h2 className="mt-4 text-lg font-semibold">Built around people</h2><p className={`mt-2 leading-relaxed ${muted}`}>The HR workflow is available now. Payroll, projects, inventory, and finance are planned modules and are not available in this version.</p></aside></div>
    </>}
  </div>;
}
