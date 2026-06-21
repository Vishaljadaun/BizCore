import { useState, useEffect, useCallback } from 'react';
import { hrApi }     from '../../../api/hrApi';
import type {
  AttendanceResponse,
  EmployeeResponse,
  PaginatedResponse,
}                    from '../../../types';
import Button        from '../../../components/shared/Button';

const statusColor: Record<string, string> = {
  Present: 'bg-green-100  text-green-700',
  Late:    'bg-yellow-100 text-yellow-700',
  HalfDay: 'bg-orange-100 text-orange-700',
  Absent:  'bg-red-100    text-red-700',
  OnLeave: 'bg-blue-100   text-blue-700',
};

const AttendancePage = () => {
  const [data,        setData]        =
    useState<PaginatedResponse<AttendanceResponse> | null>(null);
  const [employees,   setEmployees]   =
    useState<EmployeeResponse[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [empFilter,   setEmpFilter]   = useState('');
  const [dateFilter,  setDateFilter]  = useState(
    new Date().toISOString().split('T')[0]
    // Default: today's date
  );
  const [page,        setPage]        = useState(1);
  const [clockingId,  setClockingId]  =
    useState<string | null>(null);

  // Fetch employees for filter
  useEffect(() => {
    hrApi.getEmployees({ pageSize: 100 })
      .then(res => setEmployees(res.items))
      .catch(() => {});
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await hrApi.getAttendance({
        employeeId: empFilter  || undefined,
        date:       dateFilter || undefined,
        page,
        pageSize: 15,
      });
      setData(result);
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  }, [empFilter, dateFilter, page]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleClockIn = async (employeeId: string) => {
    try {
      setClockingId(employeeId);
      await hrApi.clockInEmployee(employeeId);
      fetchAttendance();
    } finally {
      setClockingId(null);
    }
  };

  const handleClockOut = async (employeeId: string) => {
    try {
      setClockingId(employeeId);
      await hrApi.clockOutEmployee(employeeId);
      fetchAttendance();
    } finally {
      setClockingId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Attendance
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track employee attendance and working hours
          </p>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4
        gap-4 mb-6">
        {[
          {
            label: 'Present',
            value: data?.items.filter(
              a => a.status === 'Present').length ?? 0,
            color: 'text-green-600',
            bg:    'bg-green-50',
          },
          {
            label: 'Late',
            value: data?.items.filter(
              a => a.status === 'Late').length ?? 0,
            color: 'text-yellow-600',
            bg:    'bg-yellow-50',
          },
          {
            label: 'Half Day',
            value: data?.items.filter(
              a => a.status === 'HalfDay').length ?? 0,
            color: 'text-orange-600',
            bg:    'bg-orange-50',
          },
          {
            label: 'On Leave',
            value: data?.items.filter(
              a => a.status === 'OnLeave').length ?? 0,
            color: 'text-blue-600',
            bg:    'bg-blue-50',
          },
        ].map((stat) => (
          <div key={stat.label}
            className={`${stat.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border
        border-gray-100 shadow-sm p-4 mb-6
        flex flex-col sm:flex-row gap-3">

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200
            rounded-lg text-sm focus:outline-none
            focus:ring-2 focus:ring-primary-500"
        />

        <select
          value={empFilter}
          onChange={(e) => setEmpFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200
            rounded-lg text-sm bg-white focus:outline-none
            focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName}
            </option>
          ))}
        </select>

        <Button variant="secondary"
          onClick={() => {
            setDateFilter(
              new Date().toISOString().split('T')[0]);
            setEmpFilter('');
          }}>
          Today
        </Button>

        {/* ⏱️ NAYA BUTTON YAHAN HAI ⏱️ */}
        {empFilter && dateFilter === new Date().toISOString().split('T')[0] && (
          <Button 
            onClick={() => handleClockIn(empFilter)}
            isLoading={clockingId === empFilter}
          >
            ⏱️ Clock In Selected
          </Button>
        )}
      </div>

      {/* Table */}
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
            <div className="text-4xl mb-3">⏰</div>
            <h3 className="font-semibold text-gray-900">
              No attendance records
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              No records found for selected date
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b
                  border-gray-100">
                  {['Employee', 'Date', 'Clock In',
                    'Clock Out', 'Hours', 'Status',
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
                {data?.items.map((att) => (
                  <tr key={att.id}
                    className="hover:bg-gray-50
                      transition-colors">

                    {/* Employee */}
                    <td className="px-6 py-4">
                      <div className="flex items-center
                        gap-3">
                        <div className="w-8 h-8 rounded-full
                          bg-primary-600 flex items-center
                          justify-center">
                          <span className="text-white
                            text-xs font-bold">
                            {att.employeeName
                              .split(' ')
                              .map(n => n[0])
                              .join('')}
                          </span>
                        </div>
                        <span className="text-sm
                          font-medium text-gray-900">
                          {att.employeeName}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-sm
                      text-gray-600">
                      {new Date(att.date)
                        .toLocaleDateString('en-IN', {
                          day:     '2-digit',
                          month:   'short',
                          weekday: 'short',
                        })}
                    </td>

                    {/* Clock In */}
                    <td className="px-6 py-4 text-sm
                      text-gray-700 font-mono">
                      {new Date(att.clockIn)
                        .toLocaleTimeString('en-IN', {
                          hour:   '2-digit',
                          minute: '2-digit',
                        })}
                    </td>

                    {/* Clock Out */}
                    <td className="px-6 py-4 text-sm
                      font-mono">
                      {att.clockOut ? (
                        <span className="text-gray-700">
                          {new Date(att.clockOut)
                            .toLocaleTimeString('en-IN', {
                              hour:   '2-digit',
                              minute: '2-digit',
                            })}
                        </span>
                      ) : (
                        <span className="text-gray-300
                          italic text-xs">
                          Not clocked out
                        </span>
                      )}
                    </td>

                    {/* Working Hours */}
                    <td className="px-6 py-4">
                      {att.workingHours ? (
                        <span className={`text-sm font-medium
                          ${att.workingHours >= 8
                            ? 'text-green-600'
                            : att.workingHours >= 4
                            ? 'text-yellow-600'
                            : 'text-red-500'
                          }`}>
                          {att.workingHours}h
                        </span>
                      ) : (
                        <span className="text-gray-300
                          text-sm">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1
                        rounded-full text-xs font-medium
                        ${statusColor[att.status] ||
                          'bg-gray-100 text-gray-700'
                        }`}>
                        {att.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      {!att.clockOut && (
                        <button
                          disabled={clockingId === att.employeeId}
                          onClick={() =>
                            handleClockOut(att.employeeId)
                          }
                          className="px-3 py-1.5 bg-red-100
                            text-red-700 text-xs rounded-lg
                            hover:bg-red-200
                            disabled:opacity-50 font-medium"
                        >
                          Clock Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;