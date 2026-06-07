import { useState, useEffect, useCallback } from 'react';
import { usersApi }      from '../../api/usersApi';
import type {
  UserResponse,
  PaginatedResponse
}                        from '../../types';
import Button            from '../../components/shared/Button';
import CreateUserModal   from './components/CreateUserModal';
import EditUserModal     from './components/EditUserModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';

// Role badge colors
const roleBadgeColor: Record<string, string> = {
  SuperAdmin:   'bg-purple-100 text-purple-700',
  CompanyAdmin: 'bg-blue-100   text-blue-700',
  Manager:      'bg-green-100  text-green-700',
  Employee:     'bg-gray-100   text-gray-700',
  Vendor:       'bg-orange-100 text-orange-700',
};

const UserManagementPage = () => {
  // ── State ──────────────────────────────────────────
  const [data,       setData]       =
    useState<PaginatedResponse<UserResponse> | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // Search + Filter state
  const [search,   setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page,     setPage]     = useState(1);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editUser,   setEditUser]   =
    useState<UserResponse | null>(null);
  const [deleteUser, setDeleteUser] =
    useState<UserResponse | null>(null);

  // Toggle loading state per user
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Fetch Users ────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    // useCallback memoizes this function
    // It won't be recreated on every render
    // Only recreated when search, roleFilter, or page changes
    try {
      setIsLoading(true);
      setError(null);
      const result = await usersApi.getUsers({
        search:   search   || undefined,
        role:     roleFilter || undefined,
        page,
        pageSize: 10,
      });
      setData(result);
    } catch (err) {
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, page]);
  // Dependencies: re-fetch when these change

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  // ── Toggle User Status ──────────────────────────────
  const handleToggleStatus = async (user: UserResponse) => {
    try {
      setTogglingId(user.id);
      const result = await usersApi.toggleStatus(user.id);
      // Update the user in local state without re-fetching
      // Optimistic-style update for better UX
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((u) =>
            u.id === user.id
              ? { ...u, isActive: result.isActive }
              : u
          ),
        };
      });
    } catch {
      setError('Failed to update user status.');
    } finally {
      setTogglingId(null);
    }
  };

  // ── After Create/Edit/Delete — Refresh List ─────────
  const handleSuccess = () => {
    setShowCreate(false);
    setEditUser(null);
    setDeleteUser(null);
    fetchUsers();
  };

  return (
    <div>
      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            User Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your team members and their access
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          size="md"
        >
          + Add User
        </Button>
      </div>

      {/* ── Search + Filter Bar ──────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100
        shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">

        {/* Search input */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2
            text-gray-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200
              rounded-lg text-sm focus:outline-none
              focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg
            text-sm focus:outline-none focus:ring-2
            focus:ring-primary-500 bg-white"
        >
          <option value="">All Roles</option>
          <option value="CompanyAdmin">Company Admin</option>
          <option value="Manager">Manager</option>
          <option value="Employee">Employee</option>
          <option value="Vendor">Vendor</option>
        </select>

        {/* Clear filters */}
        {(search || roleFilter) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setRoleFilter('');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* ── Error Message ────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg
          p-4 mb-6 text-red-700 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* ── Users Table ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100
        shadow-sm overflow-hidden">

        {isLoading ? (
          // Loading skeleton
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-primary-600
              border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 text-sm mt-3">
              Loading users...
            </p>
          </div>

        ) : data?.items.length === 0 ? (
          // Empty state
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-semibold text-gray-900">
              No users found
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              {search || roleFilter
                ? 'Try adjusting your search or filters'
                : 'Add your first team member to get started'
              }
            </p>
          </div>

        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs
                      font-semibold text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left px-6 py-3 text-xs
                      font-semibold text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-6 py-3 text-xs
                      font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs
                      font-semibold text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="text-left px-6 py-3 text-xs
                      font-semibold text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.items.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* User info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full
                            bg-primary-600 flex items-center
                            justify-center flex-shrink-0">
                            <span className="text-white text-xs
                              font-bold">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium
                              text-gray-900">
                              {user.fullName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="px-6 py-4">
                        <span className={`
                          inline-block px-2.5 py-1 rounded-full
                          text-xs font-medium
                          ${roleBadgeColor[user.role] ||
                            'bg-gray-100 text-gray-700'}
                        `}>
                          {user.role}
                        </span>
                      </td>

                      {/* Status toggle */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={togglingId === user.id}
                          className={`
                            relative inline-flex h-5 w-9
                            rounded-full transition-colors duration-200
                            focus:outline-none
                            disabled:opacity-50 disabled:cursor-wait
                            ${user.isActive
                              ? 'bg-primary-600'
                              : 'bg-gray-200'
                            }
                          `}
                          title={user.isActive
                            ? 'Click to deactivate'
                            : 'Click to activate'
                          }
                        >
                          {/* Toggle thumb */}
                          <span className={`
                            inline-block w-4 h-4 bg-white rounded-full
                            shadow transform transition-transform
                            duration-200 mt-0.5
                            ${user.isActive
                              ? 'translate-x-4'
                              : 'translate-x-0.5'
                            }
                          `} />
                        </button>
                        <span className={`ml-2 text-xs ${
                          user.isActive
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Last login */}
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.lastLogin
                          ? new Date(user.lastLogin)
                              .toLocaleDateString('en-IN', {
                                day:   '2-digit',
                                month: 'short',
                                year:  'numeric',
                              })
                          : 'Never'
                        }
                      </td>

                      {/* Joined date */}
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.createdAt)
                          .toLocaleDateString('en-IN', {
                            day:   '2-digit',
                            month: 'short',
                            year:  'numeric',
                          })
                        }
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center
                          justify-end gap-2">
                          <button
                            onClick={() => setEditUser(user)}
                            className="text-gray-400 hover:text-primary-600
                              transition-colors text-sm px-2 py-1
                              rounded hover:bg-primary-50"
                            title="Edit user"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeleteUser(user)}
                            className="text-gray-400 hover:text-red-600
                              transition-colors text-sm px-2 py-1
                              rounded hover:bg-red-50"
                            title="Delete user"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ─────────────────────────── */}
            {data && data.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100
                flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing{' '}
                  <span className="font-medium">
                    {((data.page - 1) * data.pageSize) + 1}
                  </span>
                  {' '}–{' '}
                  <span className="font-medium">
                    {Math.min(
                      data.page * data.pageSize,
                      data.totalCount
                    )}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">
                    {data.totalCount}
                  </span>
                  {' '}users
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

                  {/* Page numbers */}
                  {Array.from(
                    { length: data.totalPages },
                    (_, i) => i + 1
                  ).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`
                        w-8 h-8 text-sm rounded-lg font-medium
                        transition-colors
                        ${pageNum === page
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  ))}

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

      {/* ── Modals ────────────────────────────────────── */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSuccess={handleSuccess}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={handleSuccess}
        />
      )}

      {deleteUser && (
        <DeleteConfirmModal
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default UserManagementPage;