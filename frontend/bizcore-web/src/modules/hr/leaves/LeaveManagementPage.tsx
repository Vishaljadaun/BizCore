import { useState, useEffect, useCallback } from 'react';
import { AxiosError }   from 'axios';
import { hrApi }        from '../../../api/hrApi';
import type {
  LeaveRequestResponse,
  PaginatedResponse,
}                       from '../../../types';
import Button           from '../../../components/shared/Button';

const statusColor: Record<string, string> = {
  Pending:   'bg-yellow-100 text-yellow-700',
  Approved:  'bg-green-100  text-green-700',
  Rejected:  'bg-red-100    text-red-700',
  Cancelled: 'bg-gray-100   text-gray-500',
};

const LeaveManagementPage = () => {
  const [data,        setData]        =
    useState<PaginatedResponse<LeaveRequestResponse> | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [page,        setPage]        = useState(1);
  const [actionId,    setActionId]    = useState<string | null>(null);
  // Which leave request is being actioned

  const fetchLeaves = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await hrApi.getLeaveRequests({
        status:   statusFilter || undefined,
        page,
        pageSize: 10,
      });
      setData(result);
    } catch {
      setError('Failed to load leave requests.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const handleApprove = async (
    leaveId: string,
    approverEmployeeId: string
  ) => {
    try {
      setActionId(leaveId);
      await hrApi.approveLeave(leaveId, approverEmployeeId);
      fetchLeaves();
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(
          err.response?.data?.message ||
          'Failed to approve leave.'
        );
      }
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (
    leaveId: string,
    approverEmployeeId: string,
    reason: string
  ) => {
    try {
      setActionId(leaveId);
      await hrApi.rejectLeave(
        leaveId, approverEmployeeId, reason);
      fetchLeaves();
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(
          err.response?.data?.message ||
          'Failed to reject leave.'
        );
      }
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Leave Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Review and manage employee leave requests
          </p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6">
        {['Pending', 'Approved', 'Rejected', ''].map(
          (status) => (
            <button
              key={status || 'all'}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm
                font-medium transition-colors
                ${statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              {status || 'All'}
            </button>
          )
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200
          rounded-lg p-4 mb-6 text-red-700 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Leave Requests */}
      <div className="bg-white rounded-xl border
        border-gray-100 shadow-sm overflow-hidden">

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4
              border-primary-600 border-t-transparent
              rounded-full animate-spin mx-auto" />
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🏖️</div>
            <h3 className="font-semibold text-gray-900">
              No leave requests
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              No {statusFilter.toLowerCase()} leave requests found
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b
                    border-gray-100">
                    {['Employee', 'Leave Type', 'Dates',
                      'Days', 'Reason', 'Status',
                      'Actions'].map((h) => (
                      <th key={h} className="text-left
                        px-6 py-3 text-xs font-semibold
                        text-gray-500 uppercase
                        tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {data?.items.map((leave) => (
                    <tr key={leave.id}
                      className="hover:bg-gray-50
                        transition-colors">

                      {/* Employee */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium
                          text-gray-900">
                          {leave.employeeName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(leave.createdAt)
                            .toLocaleDateString('en-IN')}
                        </p>
                      </td>

                      {/* Leave type */}
                      <td className="px-6 py-4">
                        <span className="text-sm
                          bg-blue-50 text-blue-700
                          px-2.5 py-1 rounded-full">
                          {leave.leaveTypeName}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="px-6 py-4 text-sm
                        text-gray-700">
                        <p>{new Date(leave.startDate)
                          .toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short'
                          })}</p>
                        <p className="text-gray-400">to</p>
                        <p>{new Date(leave.endDate)
                          .toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short'
                          })}</p>
                      </td>

                      {/* Days */}
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold
                          text-gray-900">
                          {leave.totalDays}
                        </span>
                        <span className="text-xs
                          text-gray-500 ml-1">days</span>
                      </td>

                      {/* Reason */}
                      <td className="px-6 py-4 text-sm
                        text-gray-600 max-w-[200px]">
                        <p className="truncate">
                          {leave.reason}
                        </p>
                        {leave.rejectionReason && (
                          <p className="text-xs text-red-500
                            mt-1 truncate">
                            ❌ {leave.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1
                          rounded-full text-xs font-medium
                          ${statusColor[leave.status] ||
                            'bg-gray-100 text-gray-700'
                          }`}>
                          {leave.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        {leave.status === 'Pending' ? (
                          <div className="flex gap-2">
                            <button
                              disabled={actionId === leave.id}
                              onClick={() =>
                                // In real app, get approver employee ID
                                // from current user's employee profile
                                handleApprove(
                                  leave.id,
                                  leave.employeeId
                                  // This should be MANAGER's employee ID
                                  // not the applicant's ID
                                  // Will fix with proper auth context
                                )
                              }
                              className="px-3 py-1.5 bg-green-600
                                text-white text-xs rounded-lg
                                hover:bg-green-700 disabled:opacity-50
                                font-medium"
                            >
                              ✓ Approve
                            </button>
                            <button
                              disabled={actionId === leave.id}
                              onClick={() => {
                                const reason = prompt(
                                  'Rejection reason:'
                                );
                                if (reason) {
                                  handleReject(
                                    leave.id,
                                    leave.employeeId,
                                    reason
                                  );
                                }
                              }}
                              className="px-3 py-1.5 bg-red-100
                                text-red-700 text-xs rounded-lg
                                hover:bg-red-200 disabled:opacity-50
                                font-medium"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs
                            text-gray-400">
                            {leave.approvedByName
                              ? `By ${leave.approvedByName}`
                              : '—'
                            }
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="px-6 py-4 border-t
                border-gray-100 flex items-center
                justify-between">
                <p className="text-sm text-gray-500">
                  {data.totalCount} requests total
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}>
                    ← Previous
                  </Button>
                  <span className="text-sm text-gray-600 px-2">
                    Page {page} of {data.totalPages}
                  </span>
                  <Button variant="secondary" size="sm"
                    disabled={page === data.totalPages}
                    onClick={() => setPage(p => p + 1)}>
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LeaveManagementPage;