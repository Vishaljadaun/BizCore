import { Outlet, useLocation } from 'react-router-dom';
import Sidebar                  from './Sidebar';
import Navbar                   from './Navbar';

const AppLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden
      bg-gray-50 dark:bg-slate-950
      transition-colors duration-200">

      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar />

        <main className="flex-1 overflow-y-auto">

          {/* Breadcrumb */}
          <div className="px-6 py-2 border-b
            bg-white border-gray-100
            dark:bg-slate-900 dark:border-slate-700/60
            transition-colors duration-200">
            <Breadcrumb />
          </div>

          {/* Page content */}
          <div className="p-6">
            <Outlet />
          </div>

        </main>
      </div>
    </div>
  );
};

// ── Breadcrumb ─────────────────────────────────────────────────────────────
const pathLabels: Record<string, string> = {
  dashboard:         'Dashboard',
  hr:                'HR Module',
  employees:         'Employees',
  leaves:            'Leave Management',
  attendance:        'Attendance',
  projects:          'Projects',
  list:              'All Projects',
  'my-tasks':        'My Tasks',
  'time-logs':       'Time Logs',
  inventory:         'Inventory',
  products:          'Products',
  'purchase-orders': 'Purchase Orders',
  alerts:            'Stock Alerts',
  vendors:           'Vendors',
  contracts:         'Contracts',
  finance:           'Finance',
  invoices:          'Invoices',
  expenses:          'Expenses',
  reports:           'Reports',
  users:             'User Management',
};

const Breadcrumb = () => {
  const location = useLocation();
  const parts    = location.pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-xs
      text-gray-500 dark:text-slate-400">
      <span>🏠</span>
      <span>BizCore</span>
      {parts.map((part, index) => {
        const isLast = index === parts.length - 1;
        return (
          <span key={part} className="flex items-center gap-1.5">
            <span className="text-gray-300 dark:text-slate-600">›</span>
            <span className={
              isLast
                ? 'text-gray-700 font-medium dark:text-slate-200'
                : 'text-gray-400 dark:text-slate-500'
            }>
              {pathLabels[part] || part}
            </span>
          </span>
        );
      })}
    </nav>
  );
};

export default AppLayout;