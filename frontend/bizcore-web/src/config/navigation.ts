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

const staff = [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager, UserRole.Employee];
const management = [UserRole.SuperAdmin, UserRole.CompanyAdmin, UserRole.Manager];
const admins = [UserRole.SuperAdmin, UserRole.CompanyAdmin];

// Navigation mirrors the server role boundaries.
export const navigation: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦', roles: [...staff, UserRole.Vendor] },
  { label: 'My Profile', path: '/my-profile', icon: '◉', roles: staff },
  { label: 'My Leave', path: '/my-leave', icon: '☀', roles: staff },
  { label: 'HR Module', path: '/hr', icon: '♧', roles: management, children: [
    { label: 'Employees', path: '/hr/employees', icon: '◉', roles: management },
    { label: 'Departments', path: '/hr/departments', icon: '▤', roles: admins },
    { label: 'Leave Management', path: '/hr/leaves', icon: '☀', roles: management },
    { label: 'Attendance', path: '/hr/attendance', icon: '◷', roles: management },
  ] },
  { label: 'Projects', path: '/projects', icon: '▣', roles: staff, children: [
    { label: 'Projects', path: '/projects/list', icon: '▣', roles: staff },
    { label: 'All Tasks', path: '/projects/tasks', icon: '✓', roles: management },
    { label: 'My Tasks', path: '/projects/my-tasks', icon: '✓', roles: staff },
    { label: 'Time Logs', path: '/projects/time-logs', icon: '◷', roles: staff },
  ] },
  { label: 'Inventory', path: '/inventory', icon: '▤', roles: management, children: [
    { label: 'Products', path: '/inventory/products', icon: '▤', roles: management },
    { label: 'Purchase Orders', path: '/inventory/purchase-orders', icon: '↗', roles: management },
    { label: 'Stock Alerts', path: '/inventory/alerts', icon: '!', roles: management },
    { label: 'Stock History', path: '/inventory/movements', icon: '◷', roles: management },
  ] },
  { label: 'Vendors', path: '/vendors', icon: '◇', roles: management, children: [
    { label: 'Suppliers', path: '/vendors/list', icon: '◇', roles: management },
    { label: 'Contracts', path: '/vendors/contracts', icon: '▤', roles: management },
  ] },
  { label: 'Finance', path: '/finance', icon: '₹', roles: admins, children: [
    { label: 'Invoices', path: '/finance/invoices', icon: '▤', roles: admins },
    { label: 'Expenses', path: '/finance/expenses', icon: '↗', roles: admins },
    { label: 'Cash-flow Report', path: '/finance/reports', icon: '▥', roles: admins },
  ] },
  { label: 'User Management', path: '/users', icon: '⚿', roles: admins },
  { label: 'Companies', path: '/companies', icon: '▤', roles: [UserRole.SuperAdmin] },
];
export const vendorNavigation: NavItem[] = [navigation[0], { label: 'Vendor Portal', path: '/vendor-portal', icon: '◇', roles: [UserRole.Vendor] }];
