// This file contains ALL shared TypeScript interfaces and types
// They exactly match what the .NET API sends and receives
// TypeScript will catch mismatches at compile time — before you even run the app

// ── Enums ─────────────────────────────────────────────────────────────────────

// Must match the UserRole enum in .NET Domain layer exactly
export enum UserRole {
  SuperAdmin  = 'SuperAdmin',
  CompanyAdmin = 'CompanyAdmin',
  Manager     = 'Manager',
  Employee    = 'Employee',
  Vendor      = 'Vendor',
}

// ── Entity Interfaces ─────────────────────────────────────────────────────────

export interface User {
  id:          string;
  firstName:   string;
  lastName:    string;
  email:       string;
  role:        UserRole;
  isActive:    boolean;
  companyId:   string;
  companyName: string;
  employeeId?: string | null;
  // ↑ New: linked employee ID from JWT
}

export interface Company {
  id:           string;
  name:         string;
  slug:         string;
  logoUrl?:     string;  // ? = optional — may or may not exist
  subscription: string;
  isActive:     boolean;
}

// ── Auth Request/Response Shapes ──────────────────────────────────────────────

export interface LoginRequest {
  email:    string;
  password: string;
}

export interface RegisterRequest {
  companyName: string;
  firstName:   string;
  lastName:    string;
  email:       string;
  password:    string;
}

export interface AuthResponse {
  accessToken:       string;
  refreshToken:      string;
  accessTokenExpiry: string; // ISO date string: "2024-11-01T10:15:00Z"
  user:              User;
}

// ── API Error Shape ───────────────────────────────────────────────────────────

// This matches exactly what GlobalExceptionMiddleware returns from .NET
export interface ApiError {
  statusCode: number;
  message:    string;
  errors?:    Record<string, string[]>;
  // Record<string, string[]> = object with string keys and string array values
  // Example: { "email": ["Required", "Invalid format"], "password": ["Too short"] }
  timestamp:  string;
}

// ── User Management Types ─────────────────────────────

export interface UserResponse {
  id:        string;
  firstName: string;
  lastName:  string;
  fullName:  string;
  email:     string;
  role:      string;
  isActive:  boolean;
  companyId: string;
  createdAt: string;
  lastLogin: string | null;
  updatedAt: string | null;
}

export interface PaginatedResponse<T> {
  items:      T[];
  totalCount: number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

export interface CreateUserRequest {
  firstName: string;
  lastName:  string;
  email:     string;
  password:  string;
  role:      string;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName:  string;
  email:     string;
}

// ── Company Types ─────────────────────────────────────

export interface CompanyResponse {
  id:           string;
  name:         string;
  slug:         string;
  logoUrl?:     string;
  subscription: string;
  isActive:     boolean;
  totalUsers:   number;
  activeUsers:  number;
  createdAt:    string;
  updatedAt:    string | null;
}

export interface PlatformStats {
  totalCompanies:  number;
  activeCompanies: number;
  trialCompanies:  number;
  totalUsers:      number;
  activeUsers:     number;
}

export interface CreateCompanyRequest {
  name:           string;
  adminFirstName: string;
  adminLastName:  string;
  adminEmail:     string;
  adminPassword:  string;
  subscription:   string;
}

export interface UpdateCompanyRequest {
  name:         string;
  subscription: string;
}


// ── HR Types ──────────────────────────────────────────

export interface DepartmentResponse {
  id:             string;
  name:           string;
  description:    string | null;
  managerId:      string | null;
  managerName:    string | null;
  totalEmployees: number;
  isActive:       boolean;
  createdAt:      string;
}

export interface EmployeeResponse {
  id:             string;
  employeeCode:   string;
  firstName:      string;
  lastName:       string;
  fullName:       string;
  email:          string;
  phone:          string | null;
  designation:    string;
  departmentId:   string;
  departmentName: string;
  joiningDate:    string;
  salary:         number;
  isActive:       boolean;
  userId:         string | null;
  createdAt:      string;
}

export interface LeaveTypeResponse {
  id:          string;
  name:        string;
  daysAllowed: number;
  isActive:    boolean;
}

export interface LeaveBalanceResponse {
  leaveTypeId:   string;
  leaveTypeName: string;
  totalDays:     number;
  usedDays:      number;
  remainingDays: number;
  year:          number;
}

export interface LeaveRequestResponse {
  id:              string;
  employeeId:      string;
  employeeName:    string;
  leaveTypeName:   string;
  startDate:       string;
  endDate:         string;
  totalDays:       number;
  reason:          string;
  status:          string;
  approvedByName:  string | null;
  approvedAt:      string | null;
  rejectionReason: string | null;
  createdAt:       string;
}

export interface AttendanceResponse {
  id:           string;
  employeeId:   string;
  employeeName: string;
  date:         string;
  clockIn:      string;
  clockOut:     string | null;
  workingHours: number | null;
  status:       string;
  notes:        string | null;
}

export interface CreateDepartmentRequest {
  name:        string;
  description: string | null;
}

export interface CreateEmployeeRequest {
  firstName:    string;
  lastName:     string;
  email:        string;
  phone?:       string;
  designation:  string;
  departmentId: string;
  joiningDate:  string;
  salary:       number;
  userId?:      string;
}

export interface ApplyLeaveRequest {
  leaveTypeId: string;
  startDate:   string;
  endDate:     string;
  reason:      string;
}