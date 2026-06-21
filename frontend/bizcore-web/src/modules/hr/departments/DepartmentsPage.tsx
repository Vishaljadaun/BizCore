import { useState, useEffect, useCallback } from 'react';
import { hrApi }         from '../../../api/hrApi';
import type {
  DepartmentResponse,
  PaginatedResponse,
}                        from '../../../types';
import Button            from '../../../components/shared/Button';
import CreateDepartmentModal from './CreateDepartmentModal';

const DepartmentsPage = () => {
  const [data,        setData]        =
    useState<PaginatedResponse<DepartmentResponse> | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [showCreate,  setShowCreate]  = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await hrApi.getDepartments({
        search: search || undefined,
        page,
        pageSize: 10,
      });
      setData(result);
    } catch {
      setError('Failed to load departments.');
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Departments
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your company departments
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          + Add Department
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border
        border-gray-100 shadow-sm p-4 mb-6">
        <div className="relative max-w-sm">
          <span className="absolute left-3 top-1/2
            -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border
              border-gray-200 rounded-lg text-sm
              focus:outline-none focus:ring-2
              focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200
          rounded-lg p-4 mb-6 text-red-700 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4
            border-primary-600 border-t-transparent
            rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2
          lg:grid-cols-3 gap-4">
          {data?.items.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-xl border
                border-gray-100 shadow-sm p-5
                hover:shadow-md transition-shadow"
            >
              <div className="flex items-start
                justify-between mb-3">
                <div className="w-10 h-10 rounded-xl
                  bg-primary-100 flex items-center
                  justify-center">
                  <span className="text-primary-700
                    font-bold">
                    {dept.name[0]}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full
                  text-xs font-medium
                  ${dept.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                  }`}>
                  {dept.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900">
                {dept.name}
              </h3>

              {dept.description && (
                <p className="text-sm text-gray-500 mt-1
                  line-clamp-2">
                  {dept.description}
                </p>
              )}

              <div className="mt-4 pt-4 border-t
                border-gray-100 flex items-center
                justify-between text-sm">
                <div className="flex items-center
                  gap-1 text-gray-500">
                  <span>👥</span>
                  <span>{dept.totalEmployees} employees</span>
                </div>
                {dept.managerName && (
                  <div className="flex items-center
                    gap-1 text-gray-500">
                    <span>👤</span>
                    <span className="truncate max-w-[120px]">
                      {dept.managerName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {data?.items.length === 0 && (
            <div className="col-span-3 py-12 text-center">
              <div className="text-4xl mb-3">🏢</div>
              <h3 className="font-semibold text-gray-900">
                No departments yet
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Create your first department to get started
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateDepartmentModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            fetchDepartments();
          }}
        />
      )}
    </div>
  );
};

export default DepartmentsPage;