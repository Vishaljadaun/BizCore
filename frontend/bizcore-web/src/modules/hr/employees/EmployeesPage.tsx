import { useState, useEffect, useCallback } from 'react';
import { AxiosError }   from 'axios';
import { hrApi }        from '../../../api/hrApi';
import { usersApi }     from '../../../api/usersApi';
import type {
  EmployeeResponse,
  DepartmentResponse,
  UserResponse,
  PaginatedResponse,
}                       from '../../../types';
import Button           from '../../../components/shared/Button';
import CreateEmployeeModal   from './CreateEmployeeModal';
import GiveLoginAccessModal  from './GiveLoginAccessModal';

const EmployeesPage = () => {
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

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { setPage(1); }, [search, deptFilter]);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Employees
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {data?.totalCount ?? 0} total employees
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          + Add Employee
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border
        border-gray-100 shadow-sm p-4 mb-6
        flex flex-col sm:flex-row gap-3">

        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2
            -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search by name, email, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border
              border-gray-200 rounded-lg text-sm
              focus:outline-none focus:ring-2
              focus:ring-primary-500"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200
            rounded-lg text-sm bg-white focus:outline-none
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
      <div className="bg-white rounded-xl border
        border-gray-100 shadow-sm overflow-hidden">

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4
              border-primary-600 border-t-transparent
              rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm mt-3">
              Loading employees...
            </p>
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">👤</div>
            <h3 className="font-semibold text-gray-900">
              No employees found
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Add your first employee to get started
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b
                    border-gray-100">
                    {['Employee', 'Department',
                      'Designation', 'System Access',
                      'Status', 'Actions'].map((h) => (
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
                  {data?.items.map((emp) => (
                    <tr key={emp.id}
                      className="hover:bg-gray-50
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
                              text-gray-900">
                              {emp.fullName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {emp.employeeCode} • {emp.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-6 py-4">
                        <span className="text-sm
                          text-gray-700 bg-gray-100
                          px-2.5 py-1 rounded-full">
                          {emp.departmentName}
                        </span>
                      </td>

                      {/* Designation */}
                      <td className="px-6 py-4 text-sm
                        text-gray-700">
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
                              Has Access
                            </span>
                            <button
                              onClick={() =>
                                handleRevokeAccess(emp)
                              }
                              className="text-xs text-red-500
                                hover:underline text-left"
                            >
                              Revoke
                            </button>
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
                            <button
                              onClick={() =>
                                setAccessEmployee(emp)
                              }
                              className="text-xs
                                text-primary-600 hover:underline
                                text-left font-medium"
                            >
                              + Give Access
                            </button>
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
                        <button
                          className="text-primary-600
                            hover:underline text-sm font-medium"
                        >
                          View →
                        </button>
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
                  {data.totalCount} employees total
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