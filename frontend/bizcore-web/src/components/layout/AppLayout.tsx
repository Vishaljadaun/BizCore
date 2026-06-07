import { Outlet, useLocation } from 'react-router-dom';
import Sidebar                  from './Sidebar';
import Navbar                   from './Navbar';

// AppLayout is the "shell" that wraps all authenticated pages
// Structure:
// ┌────────────────────────────┐
// │         NAVBAR             │
// ├──────────┬─────────────────┤
// │          │   BREADCRUMB    │
// │ SIDEBAR  │─────────────────│
// │          │   PAGE CONTENT  │
// │          │   (Outlet)      │
// └──────────┴─────────────────┘
//
// <Outlet /> is where React Router renders the matched child route
// When URL = /dashboard → DashboardPage renders inside Outlet
// When URL = /hr/employees → EmployeesPage renders inside Outlet
// Sidebar and Navbar stay the same — only Outlet content changes

const AppLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* h-screen = exactly 100% viewport height */}
      {/* overflow-hidden = prevent outer scroll; inner areas scroll independently */}
      {/* flex = horizontal layout: sidebar on left, main on right */}

      <Sidebar />

      {/* Main area: navbar on top, content below */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* flex-1 = take all space after sidebar */}
        {/* min-w-0 = fixes a flex overflow bug where content can exceed container */}

        <Navbar />

        <main className="flex-1 overflow-y-auto">
          {/* flex-1 = take all space after navbar */}
          {/* overflow-y-auto = this area scrolls; sidebar/navbar don't */}

          {/* Breadcrumb */}
          <div className="bg-white border-b border-gray-100 px-6 py-2">
            <Breadcrumb />
          </div>

          {/* Page content — changes based on current route */}
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

// ── Breadcrumb ─────────────────────────────────────────────────────────────
// Automatically generated from the current URL path
// /hr/employees → BizCore › HR Module › Employees

const pathLabels: Record<string, string> = {
  dashboard:        'Dashboard',
  hr:               'HR Module',
  employees:        'Employees',
  leaves:           'Leave Management',
  attendance:       'Attendance',
  projects:         'Projects',
  list:             'All Projects',
  'my-tasks':       'My Tasks',
  'time-logs':      'Time Logs',
  inventory:        'Inventory',
  products:         'Products',
  'purchase-orders': 'Purchase Orders',
  alerts:           'Stock Alerts',
  vendors:          'Vendors',
  contracts:        'Contracts',
  finance:          'Finance',
  invoices:         'Invoices',
  expenses:         'Expenses',
  reports:          'Reports',
  users:            'User Management',
};

const Breadcrumb = () => {
  const location = useLocation();

  const parts = location.pathname
    .split('/')
    .filter(Boolean);
  // "/hr/employees" → ["hr", "employees"]
  // .filter(Boolean) removes empty strings from the split

  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-500">
      <span>🏠</span>
      <span>BizCore</span>
      {parts.map((part, index) => {
        const isLast = index === parts.length - 1;
        return (
          <span key={part} className="flex items-center gap-1.5">
            <span className="text-gray-300">›</span>
            <span className={
              isLast ? 'text-gray-700 font-medium' : 'text-gray-400'
            }>
              {pathLabels[part] || part}
              {/* Falls back to the raw URL segment if no label defined */}
            </span>
          </span>
        );
      })}
    </nav>
  );
};

export default AppLayout;