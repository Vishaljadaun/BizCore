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

// Only working modules appear in navigation. Planned modules are labelled on the dashboard.
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
  { label: 'User Management', path: '/users', icon: '⚿', roles: admins },
  { label: 'Companies', path: '/companies', icon: '▤', roles: [UserRole.SuperAdmin] },
];
export const vendorNavigation: NavItem[] = [navigation[0]];
