import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense }           from 'react';
import ProtectedRoute               from './ProtectedRoute';
import { UserRole }                 from '../types';

// lazy() = code splitting — each page is a separate JS chunk
// The chunk is downloaded only when the user navigates to that page
// Benefit: faster initial app load (don't download all pages upfront)
const LoginPage      = lazy(() => import('../modules/auth/LoginPage'));
const RegisterPage   = lazy(() => import('../modules/auth/RegisterPage'));
const AppLayout      = lazy(() => import('../components/layout/AppLayout'));
const DashboardPage  = lazy(() => import('../modules/dashboard/DashboardPage'));
// Add this lazy import at top:
const UserManagementPage = lazy(
  () => import('../modules/users/UserManagementPage')
);

// Add lazy imports:
const CompaniesPage       = lazy(
  () => import('../modules/companies/CompaniesPage'));

const SuperAdminDashboard = lazy(
  () => import('../modules/dashboard/SuperAdminDashboard'));

const CompanyDetailPage = lazy(
  () => import('../modules/companies/CompanyDetailPage')
);

// Temporary placeholder for modules not yet built
const ComingSoon = ({ title }: { title: string }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
    <div className="text-5xl mb-4">🚧</div>
    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    <p className="text-gray-500 mt-2 text-sm">
      This module will be built in an upcoming step
    </p>
  </div>
);

// Loading spinner shown while lazy chunks are downloading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary-600
        border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    // Suspense must wrap lazy components
    // While chunk is downloading, it shows the fallback
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ── Public Routes (no login required) ─────────────────────── */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Protected Routes (login required) ─────────────────────── */}
        {/* Outer ProtectedRoute: checks isAuthenticated */}
        <Route element={<ProtectedRoute />}>

          {/* AppLayout: renders Sidebar + Navbar + Outlet */}
          <Route element={<AppLayout />}>

            {/* Dashboard — all authenticated roles */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* HR — Managers and above */}
            <Route element={<ProtectedRoute allowedRoles={[
              UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager
            ]} />}>
              <Route path="/hr/employees" element={<ComingSoon title="Employees" />} />
              <Route path="/hr/leaves"    element={<ComingSoon title="Leave Management" />} />
              <Route path="/hr/attendance" element={<ComingSoon title="Attendance" />} />
            </Route>

            {/* Projects — Employees and above */}
            <Route element={<ProtectedRoute allowedRoles={[
              UserRole.SuperAdmin, UserRole.CompanyAdmin,
              UserRole.Manager,    UserRole.Employee
            ]} />}>
              <Route path="/projects/list"       element={<ComingSoon title="All Projects" />} />
              <Route path="/projects/my-tasks"   element={<ComingSoon title="My Tasks" />} />
              <Route path="/projects/time-logs"  element={<ComingSoon title="Time Logs" />} />
            </Route>

            {/* Inventory — Managers and above */}
            <Route element={<ProtectedRoute allowedRoles={[
              UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager
            ]} />}>
              <Route path="/inventory/products"        element={<ComingSoon title="Products" />} />
              <Route path="/inventory/purchase-orders" element={<ComingSoon title="Purchase Orders" />} />
              <Route path="/inventory/alerts"          element={<ComingSoon title="Stock Alerts" />} />
            </Route>

            {/* Vendors — Managers and above */}
            <Route element={<ProtectedRoute allowedRoles={[
              UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager
            ]} />}>
              <Route path="/vendors/list"      element={<ComingSoon title="Vendor List" />} />
              <Route path="/vendors/contracts" element={<ComingSoon title="Contracts" />} />
            </Route>

            {/* Finance — Admins only */}
            <Route element={<ProtectedRoute allowedRoles={[
              UserRole.SuperAdmin, UserRole.CompanyAdmin
            ]} />}>
              <Route path="/finance/invoices" element={<ComingSoon title="Invoices" />} />
              <Route path="/finance/expenses" element={<ComingSoon title="Expenses" />} />
              <Route path="/finance/reports"  element={<ComingSoon title="Reports" />} />
            </Route>

            {/* User Management — Admins only */}
            <Route element={<ProtectedRoute allowedRoles={[
              UserRole.SuperAdmin, UserRole.CompanyAdmin
            ]} />}>
              <Route
    path="/users"
    element={<UserManagementPage />}
    // Real page now — not ComingSoon
  />
// Routes mein add karo (SuperAdmin only section):
<Route element={<ProtectedRoute
  allowedRoles={[UserRole.SuperAdmin]} />
}>
  <Route
    path="/companies"
    element={<CompaniesPage />}
  />
  <Route
    path="/companies/:id"
    element={<CompanyDetailPage />}
  />
</Route>

            </Route>

          </Route>
        </Route>

        {/* ── Special pages ─────────────────────────────────────────── */}
        <Route path="/unauthorized" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">🚫</div>
              <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
              <p className="text-gray-500 mt-2">
                You don't have permission to view this page.
              </p>
              <button
                onClick={() => window.history.back()}
                className="mt-6 px-6 py-2.5 bg-primary-600 text-white
                  rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Go Back
              </button>
            </div>
          </div>
        } />

        {/* Default: redirect / to /dashboard */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        {/* Catch-all: any unknown URL → dashboard */}
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </Suspense>
  );
};

export default AppRoutes;