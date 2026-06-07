import { UserRole } from '../types';

// Shape of a single navigation item
export interface NavItem {
  label:     string;       // Display text: "Dashboard", "HR Module"
  path:      string;       // URL path: "/dashboard", "/hr/employees"
  icon:      string;       // Emoji icon (can replace with lucide-react later)
  roles:     UserRole[];   // Which roles can see this item
  children?: NavItem[];    // Sub-menu items (optional)
  badge?:    number;       // Notification count badge (optional)
}

// Main navigation — shown to all roles except Vendor
// Adding a new module = just add an object here
// The sidebar automatically renders whatever is in this array
export const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    path:  '/dashboard',
    icon:  '📊',
    // Every role can see the dashboard
    roles: [
      UserRole.SuperAdmin,
      UserRole.CompanyAdmin,
      UserRole.Manager,
      UserRole.Employee,
      UserRole.Vendor,
    ],
  },

  // ── HR Module ────────────────────────────────────────────────────────────
  {
    label: 'HR Module',
    path:  '/hr',
    icon:  '👥',
    // Employees cannot access HR management
    roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager],
    children: [
      {
        label: 'Employees',
        path:  '/hr/employees',
        icon:  '👤',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager],
      },
      {
        label: 'Leave Management',
        path:  '/hr/leaves',
        icon:  '🏖️',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager],
      },
      {
        label: 'Attendance',
        path:  '/hr/attendance',
        icon:  '⏰',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager],
      },
    ],
  },

  // ── Projects Module ───────────────────────────────────────────────────────
  {
    label: 'Projects',
    path:  '/projects',
    icon:  '📋',
    // Employees can see projects — they work on tasks
    roles: [
      UserRole.SuperAdmin,
      UserRole.CompanyAdmin,
      UserRole.Manager,
      UserRole.Employee,
    ],
    children: [
      {
        label: 'All Projects',
        path:  '/projects/list',
        icon:  '📁',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager],
      },
      {
        label: 'My Tasks',
        path:  '/projects/my-tasks',
        icon:  '✅',
        // Employees can see their own tasks
        roles: [
          UserRole.SuperAdmin,
          UserRole.CompanyAdmin,
          UserRole.Manager,
          UserRole.Employee,
        ],
      },
      {
        label: 'Time Logs',
        path:  '/projects/time-logs',
        icon:  '⏱️',
        roles: [
          UserRole.SuperAdmin,
          UserRole.CompanyAdmin,
          UserRole.Manager,
          UserRole.Employee,
        ],
      },
    ],
  },

  // ── Inventory Module ──────────────────────────────────────────────────────
  {
    label: 'Inventory',
    path:  '/inventory',
    icon:  '📦',
    roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager],
    children: [
      {
        label: 'Products',
        path:  '/inventory/products',
        icon:  '🏷️',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager],
      },
      {
        label: 'Purchase Orders',
        path:  '/inventory/purchase-orders',
        icon:  '🛒',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager],
      },
      {
        label: 'Stock Alerts',
        path:  '/inventory/alerts',
        icon:  '⚠️',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin],
      },
    ],
  },

  // ── Vendors Module ────────────────────────────────────────────────────────
  {
    label: 'Vendors',
    path:  '/vendors',
    icon:  '🤝',
    roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager],
    children: [
      {
        label: 'Vendor List',
        path:  '/vendors/list',
        icon:  '🏢',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager],
      },
      {
        label: 'Contracts',
        path:  '/vendors/contracts',
        icon:  '📝',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin],
      },
    ],
  },

  // ── Finance Module ────────────────────────────────────────────────────────
  {
    label: 'Finance',
    path:  '/finance',
    icon:  '💰',
    // Only admins can see financial data
    roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin],
    children: [
      {
        label: 'Invoices',
        path:  '/finance/invoices',
        icon:  '🧾',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin],
      },
      {
        label: 'Expenses',
        path:  '/finance/expenses',
        icon:  '💸',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin],
      },
      {
        label: 'Reports',
        path:  '/finance/reports',
        icon:  '📈',
        roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin],
      },
    ],
  },

  // ── User Management ───────────────────────────────────────────────────────
  {
    label: 'User Management',
    path:  '/users',
    icon:  '⚙️',
    roles: [UserRole.SuperAdmin, UserRole.CompanyAdmin],
  },

  // Navigation array mein add karo (SuperAdmin only):
{
  label: 'Companies',
  path:  '/companies',
  icon:  '🏢',
  roles: [UserRole.SuperAdmin],
  // Sirf SuperAdmin ko dikhega
},

];

// Separate navigation for Vendor portal
// Vendors log in and see this — not the main navigation above
export const vendorNavigation: NavItem[] = [
  {
    label: 'Dashboard',
    path:  '/vendor-portal/dashboard',
    icon:  '📊',
    roles: [UserRole.Vendor],
  },
  {
    label: 'Purchase Orders',
    path:  '/vendor-portal/orders',
    icon:  '🛒',
    roles: [UserRole.Vendor],
  },
  {
    label: 'My Contracts',
    path:  '/vendor-portal/contracts',
    icon:  '📝',
    roles: [UserRole.Vendor],
  },
];