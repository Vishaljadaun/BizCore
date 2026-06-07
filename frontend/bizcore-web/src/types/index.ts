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
  id:          string;   // UUID from .NET — comes as string in JSON
  firstName:   string;
  lastName:    string;
  email:       string;
  role:        UserRole;
  isActive:    boolean;
  companyId:   string;
  companyName: string;
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