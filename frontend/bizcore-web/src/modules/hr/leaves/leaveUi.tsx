import type { LeaveRequestResponse, PaginatedResponse } from '../../../types';
import Button from '../../../components/shared/Button';

export const panel = 'rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900';
export const field = 'w-full min-w-0 rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
export const muted = 'text-sm text-gray-500 dark:text-slate-400';
export function Status({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300',
    Approved: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-300',
    Rejected: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300',
    Cancelled: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[status] || colors.Cancelled}`}>{status}</span>;
}
export function RequestDetails({ request }: { request: LeaveRequestResponse }) {
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-semibold">{request.leaveTypeName} · {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}</h3>
      <Status status={request.status} />
    </div>
    <p className={muted}>{request.startDate} → {request.endDate}</p>
    <p className="whitespace-pre-wrap break-words text-sm">{request.reason}</p>
    {request.approvedByName && <p className={muted}>Reviewed by {request.approvedByName}</p>}
    {request.rejectionReason && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">Reason: {request.rejectionReason}</p>}
  </div>;
}
export function Pagination({ data, page, onChange, disabled }: {
  data: PaginatedResponse<LeaveRequestResponse>; page: number; onChange: (page: number) => void; disabled: boolean;
}) {
  if (data.totalPages <= 1) return null;
  return <div className="flex flex-wrap items-center justify-between gap-3">
    <p className={muted}>Page {page} of {data.totalPages} · {data.totalCount} requests</p>
    <div className="flex gap-2">
      <Button variant="secondary" disabled={disabled || page === 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <Button variant="secondary" disabled={disabled || page >= data.totalPages} onClick={() => onChange(page + 1)}>Next</Button>
    </div>
  </div>;
}
