import { useState, useEffect, useCallback } from 'react';
import { useNavigate }    from 'react-router-dom';
import { AxiosError }     from 'axios';
import { companiesApi }   from '../../api/companiesApi';
import type {
  CompanyResponse,
  PaginatedResponse,
}                         from '../../types';
import Button             from '../../components/shared/Button';
import CreateCompanyModal from './components/CreateCompanyModal';

const subscriptionColor: Record<string, string> = {
  trial:      'bg-yellow-100 text-yellow-700',
  pro:        'bg-blue-100   text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const CompaniesPage = () => {
  const navigate = useNavigate();
  const [data,        setData]        =
    useState<PaginatedResponse<CompanyResponse> | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page,        setPage]        = useState(1);
  const [showCreate,  setShowCreate]  = useState(false);
  const [togglingId,  setTogglingId]  =
    useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await companiesApi.getCompanies({
        search:   search   || undefined,
        status:   statusFilter || undefined,
        page,
        pageSize: 10,
      });
      setData(result);
    } catch {
      setError('Failed to load companies.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleToggle = async (company: CompanyResponse) => {
    try {
      setTogglingId(company.id);
      const result = await companiesApi
        .toggleCompany(company.id);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((c) =>
            c.id === company.id
              ? { ...c, isActive: result.isActive }
              : c
          ),
        };
      });
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(
          err.response?.data?.message ||
          'Failed to update company.'
        );
      }
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Companies
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage all registered companies on BizCore
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          + New Company
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border
        border-gray-100 shadow-sm p-4 mb-6
        flex flex-col sm:flex-row gap-3">

        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2
            -translate-y-1/2 text-gray-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border
              border-gray-200 rounded-lg text-sm
              focus:outline-none focus:ring-2
              focus:ring-primary-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200
            rounded-lg text-sm focus:outline-none
            focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="trial">Trial</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>

        {(search || statusFilter) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setStatusFilter('');
            }}
          >
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
              Loading companies...
            </p>
          </div>

        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🏢</div>
            <h3 className="font-semibold text-gray-900">
              No companies found
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Create your first company to get started
            </p>
          </div>

        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100
                    bg-gray-50">
                    {['Company', 'Subscription', 'Users',
                      'Status', 'Created', 'Actions']
                      .map((h) => (
                        <th key={h} className="text-left
                          px-6 py-3 text-xs font-semibold
                          text-gray-500 uppercase
                          tracking-wider">
                          {h}
                        </th>
                      ))
                    }
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.items.map((company) => (
                    <tr
                      key={company.id}
                      className="hover:bg-gray-50
                        transition-colors"
                    >
                      {/* Company info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center
                          gap-3">
                          <div className="w-9 h-9 rounded-xl
                            bg-primary-100 flex items-center
                            justify-center flex-shrink-0">
                            <span className="text-primary-700
                              font-bold text-sm">
                              {company.name[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium
                              text-gray-900">
                              {company.name}
                            </p>
                            <p className="text-xs
                              text-gray-500">
                              {company.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Subscription */}
                      <td className="px-6 py-4">
                        <span className={`
                          px-2.5 py-1 rounded-full
                          text-xs font-medium
                          ${subscriptionColor[
                            company.subscription
                          ] || 'bg-gray-100 text-gray-700'}
                        `}>
                          {company.subscription}
                        </span>
                      </td>

                      {/* Users */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {company.activeUsers}/
                          {company.totalUsers}
                        </p>
                        <p className="text-xs text-gray-400">
                          active/total
                        </p>
                      </td>

                      {/* Status toggle */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            handleToggle(company)
                          }
                          disabled={
                            togglingId === company.id ||
                            company.slug === 'bizcore-system'
                          }
                          className={`
                            relative inline-flex h-5 w-9
                            rounded-full transition-colors
                            duration-200 focus:outline-none
                            disabled:opacity-50
                            disabled:cursor-not-allowed
                            ${company.isActive
                              ? 'bg-primary-600'
                              : 'bg-gray-200'
                            }
                          `}
                        >
                          <span className={`
                            inline-block w-4 h-4 bg-white
                            rounded-full shadow transform
                            transition-transform duration-200
                            mt-0.5
                            ${company.isActive
                              ? 'translate-x-4'
                              : 'translate-x-0.5'
                            }
                          `} />
                        </button>
                        <span className={`ml-2 text-xs ${
                          company.isActive
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }`}>
                          {company.isActive
                            ? 'Active'
                            : 'Inactive'
                          }
                        </span>
                      </td>

                      {/* Created date */}
                      <td className="px-6 py-4
                        text-sm text-gray-500">
                        {new Date(company.createdAt)
                          .toLocaleDateString('en-IN', {
                            day:   '2-digit',
                            month: 'short',
                            year:  'numeric',
                          })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            navigate(
                              `/companies/${company.id}`
                            )
                          }
                          className="text-primary-600
                            hover:underline text-sm
                            font-medium"
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
                  {data.totalCount} companies total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {data.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateCompanyModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            fetchCompanies();
          }}
        />
      )}
    </div>
  );
};

export default CompaniesPage;