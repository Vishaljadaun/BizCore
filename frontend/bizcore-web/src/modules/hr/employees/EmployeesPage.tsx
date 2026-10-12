import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../store/authStore';
import api from '../../../api/axiosClient';
import { Dialog, button, primary, muted } from '../../operations/ui';
import { errorText } from '../../operations/errors';
import { AxiosError }   from 'axios';
import { hrApi }        from '../../../api/hrApi';
import type {
  EmployeeResponse,
  DepartmentResponse,
  PaginatedResponse,
}                       from '../../../types';
import Button           from '../../../components/shared/Button';
import CreateEmployeeModal   from './CreateEmployeeModal';
import GiveLoginAccessModal  from './GiveLoginAccessModal';

const EmployeesPage = () => {
  const role = useAuthStore(s => s.user?.role);
  const canManage = role === 'CompanyAdmin' || role === 'SuperAdmin';
  const [editing, setEditing] = useState<EmployeeResponse | null>(null);
  const [viewing, setViewing] = useState<EmployeeResponse | null>(null);
  const [statusEmployee, setStatusEmployee] = useState<EmployeeResponse | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [data,        setData]        =
    useState<PaginatedResponse<EmployeeResponse> | null>(null);
  const [departments, setDepartments] =
    useState<DepartmentResponse[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [deptFilter,  setDeptFilter]  = useState('');
  const [page,        setPage]        = useState(1);
  const [showCreate,  setShowCreate]  = useState(false);
  const [accessEmployee, setAccessEmployee] =
    useState<EmployeeResponse | null>(null);

  useEffect(() => {
    hrApi.getDepartments({ pageSize: 100 })
      .then(res => setDepartments(res.items))
      .catch(() => {});
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await hrApi.getEmployees({
        search:       search     || undefined,
        departmentId: deptFilter || undefined,
        page,
        pageSize: 10,
      });
      setData(result);
    } catch {
      setError('Failed to load employees.');
    } finally {
      setIsLoading(false);
    }
  }, [search, deptFilter, page]);

  useEffect(() => {
    // This effect starts an external request and exposes its loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchEmployees();
  }, [fetchEmployees]);

  const handleRevokeAccess = async (emp: EmployeeResponse) => {
    if (!confirm(
      `Revoke login access for ${emp.fullName}?`
    )) return;

    try {
      await hrApi.revokeLoginAccess(emp.id);
      fetchEmployees();
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(
          err.response?.data?.message ||
          'Failed to revoke access.'
        );
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Employees
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            {data?.totalCount ?? 0} total employees
          </p>
        </div>
        {canManage && <Button onClick={() => setShowCreate(true)}>+ Add Employee</Button>}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border
        border-gray-100 dark:border-slate-800 shadow-sm p-4 mb-6
        flex flex-col sm:flex-row gap-3">

        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2
            -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search by name, email, code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border
              border-gray-200 dark:border-slate-700 rounded-lg text-sm
              focus:outline-none focus:ring-2
              focus:ring-primary-500"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-200 dark:border-slate-700
            rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none
            focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {(search || deptFilter) && (
          <Button variant="ghost"
            onClick={() => {
              setSearch('');
              setDeptFilter('');
            }}>
            Clear
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200
          rounded-lg p-4 mb-6 text-red-700 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border
        border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4
              border-primary-600 border-t-transparent
              rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-3">
              Loading employees...
            </p>
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">👤</div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">
              No employees found
            </h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
              Add your first employee to get started
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b
                    border-gray-100 dark:border-slate-800">
                    {['Employee', 'Department',
                      'Designation', 'System Access',
                      'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left
                        px-6 py-3 text-xs font-semibold
                        text-gray-500 dark:text-slate-400 uppercase
                        tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {data?.items.map((emp) => (
                    <tr key={emp.id}
                      className="hover:bg-gray-50 dark:bg-slate-800/50
                        transition-colors">

                      {/* Employee info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center
                          gap-3">
                          <div className="w-9 h-9 rounded-full
                            bg-primary-600 flex items-center
                            justify-center flex-shrink-0">
                            <span className="text-white
                              text-xs font-bold">
                              {emp.firstName[0]}
                              {emp.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium
                              text-gray-900 dark:text-slate-100">
                              {emp.fullName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {emp.employeeCode} • {emp.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-6 py-4">
                        <span className="text-sm
                          text-gray-700 dark:text-slate-300 bg-gray-100
                          px-2.5 py-1 rounded-full">
                          {emp.departmentName}
                        </span>
                      </td>

                      {/* Designation */}
                      <td className="px-6 py-4 text-sm
                        text-gray-700 dark:text-slate-300">
                        {emp.designation}
                      </td>

                      {/* System Access */}
                      <td className="px-6 py-4">
                        {emp.userId ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center
                              gap-1.5 text-xs font-medium
                              text-green-600">
                              <span className="w-1.5 h-1.5
                                rounded-full bg-green-500" />
                              {emp.isActive ? 'Has Access' : 'Login disabled'}
                            </span>
                            {canManage && <button
                              onClick={() =>
                                handleRevokeAccess(emp)
                              }
                              className="text-xs text-red-500
                                hover:underline text-left"
                            >
                              Revoke
                            </button>}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center
                              gap-1.5 text-xs font-medium
                              text-gray-400">
                              <span className="w-1.5 h-1.5
                                rounded-full bg-gray-300" />
                              No Access
                            </span>
                            {canManage && emp.isActive && <button
                              onClick={() =>
                                setAccessEmployee(emp)
                              }
                              className="text-xs
                                text-primary-600 hover:underline
                                text-left font-medium"
                            >
                              + Give Access
                            </button>}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`flex items-center
                          gap-1.5 text-xs font-medium
                          ${emp.isActive
                            ? 'text-green-600'
                            : 'text-gray-400'
                          }`}>
                          <span className={`w-1.5 h-1.5
                            rounded-full
                            ${emp.isActive
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                            }`} />
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2"><button className={button} onClick={() => setViewing(emp)}>View</button>{canManage && <><button className={button} onClick={() => setEditing(emp)}>Edit</button><button className={button} onClick={() => { setStatusError(''); setStatusEmployee(emp); }}>{emp.isActive ? 'Deactivate' : 'Reactivate'}</button></>}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="px-6 py-4 border-t
                border-gray-100 dark:border-slate-800 flex items-center
                justify-between">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {data.totalCount} employees total
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}>
                    ← Previous
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-slate-300 px-2">
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

      {editing && <CreateEmployeeModal employee={editing} departments={departments} onClose={() => setEditing(null)} onSuccess={() => { setEditing(null); void fetchEmployees(); }} />}
      {viewing && <Dialog title={viewing.fullName} close={() => setViewing(null)}><dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Object.entries({ 'Employee code': viewing.employeeCode, Email: viewing.email, Phone: viewing.phone || 'Not provided', Department: viewing.departmentName, Designation: viewing.designation, 'Joining date': viewing.joiningDate.slice(0, 10), 'Salary (INR)': viewing.salary.toLocaleString('en-IN'), Status: viewing.isActive ? 'Active' : 'Inactive' }).map(([label, value]) => <div key={label}><dt className={muted}>{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}</dl></Dialog>}
      {statusEmployee && <Dialog title={`${statusEmployee.isActive ? 'Deactivate' : 'Reactivate'} employee`} close={() => setStatusEmployee(null)} busy={statusBusy}><div className="space-y-4"><p>{statusEmployee.fullName}</p><p className={muted}>{statusEmployee.isActive ? 'This preserves employee history and disables their linked login. Open attendance must be clocked out first.' : 'This reactivates the employee record. Reactivate their login separately in User Management when they should regain access.'}</p>{statusError && <p role="alert" className="text-sm text-red-600">{statusError}</p>}<button className={primary} disabled={statusBusy} onClick={async () => { setStatusBusy(true); setStatusError(''); try { await api.put(`/hr/employees/${statusEmployee.id}/status`, { isActive: !statusEmployee.isActive }); setStatusEmployee(null); await fetchEmployees(); } catch (err) { setStatusError(errorText(err)); } finally { setStatusBusy(false); } }}>{statusBusy ? 'Saving…' : 'Confirm'}</button></div></Dialog>}
      {/* Create Employee Modal */}
      {showCreate && (
        <CreateEmployeeModal
          departments={departments}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            fetchEmployees();
          }}
        />
      )}

      {/* Give Login Access Modal */}
      {accessEmployee && (
        <GiveLoginAccessModal
          employee={accessEmployee}
          onClose={() => setAccessEmployee(null)}
          onSuccess={() => {
            setAccessEmployee(null);
            fetchEmployees();
          }}
        />
      )}
    </div>
  );
};

export default EmployeesPage;
