import { useState, useEffect }  from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AxiosError }            from 'axios';
import { companiesApi }          from '../../api/companiesApi';
import type {
  CompanyResponse,
  UserResponse,
  PaginatedResponse,
}                                from '../../types';
import Button                    from '../../components/shared/Button';

// Role badge colors
const roleBadgeColor: Record<string, string> = {
  SuperAdmin:   'bg-purple-100 text-purple-700',
  CompanyAdmin: 'bg-blue-100   text-blue-700',
  Manager:      'bg-green-100  text-green-700',
  Employee:     'bg-gray-100   text-gray-700',
  Vendor:       'bg-orange-100 text-orange-700',
};

const subscriptionColor: Record<string, string> = {
  trial:      'bg-yellow-100 text-yellow-700',
  pro:        'bg-blue-100   text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const CompanyDetailPage = () => {
  const { id }     = useParams<{ id: string }>();
  // useParams reads URL params
  // /companies/:id → id = company UUID
  const navigate   = useNavigate();

  // Company info state
  const [company,   setCompany]   =
    useState<CompanyResponse | null>(null);

  // Users list state
  const [usersData, setUsersData] =
    useState<PaginatedResponse<UserResponse> | null>(null);

  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [isLoadingUsers,   setIsLoadingUsers]   = useState(true);
  const [error,            setError]            =
    useState<string | null>(null);
  const [page, setPage] = useState(1);

  // ── Fetch Company Details ──────────────────────────
  useEffect(() => {
    if (!id) return;

    const fetchCompany = async () => {
      try {
        setIsLoadingCompany(true);
        const data = await companiesApi.getCompanyById(id);
        setCompany(data);
      } catch (err) {
        if (err instanceof AxiosError) {
          setError(
            err.response?.data?.message ||
            'Failed to load company details.'
          );
        }
      } finally {
        setIsLoadingCompany(false);
      }
    };

    fetchCompany();
  }, [id]);

  // ── Fetch Company Users ────────────────────────────
  useEffect(() => {
    if (!id) return;

    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const data = await companiesApi
          .getCompanyUsers(id, page, 10);
        setUsersData(data);
      } catch {
        setError('Failed to load company users.');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [id, page]);

  // ── Loading State ──────────────────────────────────
  if (isLoadingCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4
            border-primary-600 border-t-transparent
            rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">
            Loading company details...
          </p>
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200
        rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="font-semibold text-red-700">
          {error}
        </h3>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate('/companies')}
        >
          ← Back to Companies
        </Button>
      </div>
    );
  }

  if (!company) return null;

  return (
    <div>
      {/* ── Back Button ─────────────────────────────── */}
      <button
        onClick={() => navigate('/companies')}
        className="flex items-center gap-2 text-gray-500
          hover:text-gray-700 text-sm mb-6
          hover:underline"
      >
        ← Back to Companies
      </button>

      {/* ── Company Header Card ──────────────────────── */}
      <div className="bg-white rounded-2xl border
        border-gray-100 shadow-sm p-6 mb-6">

        <div className="flex items-start
          justify-between flex-wrap gap-4">

          {/* Left — Company Info */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl
              bg-primary-600 flex items-center
              justify-center flex-shrink-0">
              <span className="text-white text-2xl
                font-bold">
                {company.name[0].toUpperCase()}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3
                flex-wrap">
                <h1 className="text-2xl font-bold
                  text-gray-900">
                  {company.name}
                </h1>

                {/* Active/Inactive badge */}
                <span className={`
                  px-3 py-1 rounded-full text-xs
                  font-semibold
                  ${company.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100   text-red-700'
                  }
                `}>
                  {company.isActive ? '● Active' : '● Inactive'}
                </span>
              </div>

              <p className="text-gray-500 text-sm mt-1">
                {company.slug}
              </p>

              <div className="flex items-center gap-2 mt-2">
                <span className={`
                  px-2.5 py-1 rounded-full text-xs
                  font-medium
                  ${subscriptionColor[company.subscription]
                    || 'bg-gray-100 text-gray-700'}
                `}>
                  {company.subscription} plan
                </span>
              </div>
            </div>
          </div>

          {/* Right — Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // Edit modal — future enhancement
              }}
            >
              ✏️ Edit
            </Button>
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4
          gap-4 mt-6 pt-6 border-t border-gray-100">

          <div className="text-center">
            <p className="text-2xl font-bold
              text-gray-900">
              {company.totalUsers}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Total Users
            </p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold
              text-green-600">
              {company.activeUsers}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Active Users
            </p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold
              text-red-500">
              {company.totalUsers - company.activeUsers}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Inactive Users
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold
              text-gray-900">
              {new Date(company.createdAt)
                .toLocaleDateString('en-IN', {
                  day:   '2-digit',
                  month: 'long',
                  year:  'numeric',
                })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Registered On
            </p>
          </div>
        </div>
      </div>

      {/* ── Users Table ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border
        border-gray-100 shadow-sm overflow-hidden">

        {/* Table Header */}
        <div className="px-6 py-4 border-b border-gray-100
          flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">
              Company Users
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              All users registered under {company.name}
            </p>
          </div>
          <span className="bg-primary-100 text-primary-700
            px-3 py-1 rounded-full text-sm font-medium">
            {company.totalUsers} total
          </span>
        </div>

        {/* Loading Users */}
        {isLoadingUsers ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-4
              border-primary-600 border-t-transparent
              rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm mt-2">
              Loading users...
            </p>
          </div>

        ) : usersData?.items.length === 0 ? (
          // Empty state
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-semibold text-gray-900">
              No users found
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              This company has no users yet
            </p>
          </div>

        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b
                    border-gray-100">
                    <th className="text-left px-6 py-3
                      text-xs font-semibold text-gray-500
                      uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left px-6 py-3
                      text-xs font-semibold text-gray-500
                      uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-6 py-3
                      text-xs font-semibold text-gray-500
                      uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-3
                      text-xs font-semibold text-gray-500
                      uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="text-left px-6 py-3
                      text-xs font-semibold text-gray-500
                      uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {usersData?.items.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50
                        transition-colors"
                    >
                      {/* User info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center
                          gap-3">
                          {/* Avatar with initials */}
                          <div className="w-9 h-9
                            rounded-full bg-primary-600
                            flex items-center
                            justify-center flex-shrink-0">
                            <span className="text-white
                              text-xs font-bold">
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm
                              font-medium text-gray-900">
                              {user.fullName}
                            </p>
                            <p className="text-xs
                              text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`
                          px-2.5 py-1 rounded-full
                          text-xs font-medium
                          ${roleBadgeColor[user.role]
                            || 'bg-gray-100 text-gray-700'}
                        `}>
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`
                          flex items-center gap-1.5
                          text-xs font-medium
                          ${user.isActive
                            ? 'text-green-600'
                            : 'text-gray-400'
                          }
                        `}>
                          <span className={`
                            w-1.5 h-1.5 rounded-full
                            ${user.isActive
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                            }
                          `} />
                          {user.isActive
                            ? 'Active'
                            : 'Inactive'
                          }
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="px-6 py-4
                        text-sm text-gray-500">
                        {user.lastLogin
                          ? new Date(user.lastLogin)
                              .toLocaleDateString('en-IN', {
                                day:   '2-digit',
                                month: 'short',
                                year:  'numeric',
                              })
                          : (
                            <span className="text-gray-300
                              italic">
                              Never logged in
                            </span>
                          )
                        }
                      </td>

                      {/* Joined */}
                      <td className="px-6 py-4
                        text-sm text-gray-500">
                        {new Date(user.createdAt)
                          .toLocaleDateString('en-IN', {
                            day:   '2-digit',
                            month: 'short',
                            year:  'numeric',
                          })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {usersData && usersData.totalPages > 1 && (
              <div className="px-6 py-4 border-t
                border-gray-100 flex items-center
                justify-between">
                <p className="text-sm text-gray-500">
                  Showing{' '}
                  {((page - 1) * 10) + 1}–
                  {Math.min(
                    page * 10,
                    usersData.totalCount
                  )}{' '}
                  of {usersData.totalCount} users
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

                  <span className="text-sm text-gray-600
                    px-2">
                    Page {page} of {usersData.totalPages}
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === usersData.totalPages}
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
    </div>
  );
};

export default CompanyDetailPage;