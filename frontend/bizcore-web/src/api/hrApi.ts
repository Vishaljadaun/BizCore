import axiosClient from './axiosClient';
import type {
  DepartmentResponse,
  LeaveTypeResponse,
  OverviewResponse,
  EmployeeResponse,
  LeaveBalanceResponse,
  LeaveRequestResponse,
  AttendanceResponse,
  PaginatedResponse,
  CreateDepartmentRequest,
  CreateEmployeeRequest,
  ApplyLeaveRequest,
} from '../types';

export const hrApi = {

  // ── Departments ──────────────────────────────────────
  getDepartments: async (params?: {
    search?:   string;
    page?:     number;
    pageSize?: number;
  }): Promise<PaginatedResponse<DepartmentResponse>> => {
    const res = await axiosClient.get(
      '/hr/departments', { params });
    return res.data;
  },

  createDepartment: async (
    data: CreateDepartmentRequest
  ): Promise<DepartmentResponse> => {
    const res = await axiosClient
      .post('/hr/departments', data);
    return res.data;
  },

  updateDepartment: async (
    id:   string,
    data: { name: string; description: string | null; managerId: string | null }
  ): Promise<DepartmentResponse> => {
    const res = await axiosClient
      .put(`/hr/departments/${id}`, data);
    return res.data;
  },

  // ── Employees ────────────────────────────────────────
  getEmployees: async (params?: {
    search?:       string;
    departmentId?: string;
    isActive?:     boolean;
    page?:         number;
    pageSize?:     number;
  }): Promise<PaginatedResponse<EmployeeResponse>> => {
    const res = await axiosClient.get(
      '/hr/employees', { params });
    return res.data;
  },

  getEmployeeById: async (
    id: string
  ): Promise<EmployeeResponse> => {
    const res = await axiosClient
      .get(`/hr/employees/${id}`);
    return res.data;
  },

  // Current logged-in user's own employee profile
  getMyProfile: async (): Promise<EmployeeResponse> => {
    const res = await axiosClient.get('/hr/employees/me');
    return res.data;
  },

  createEmployee: async (
    data: CreateEmployeeRequest
  ): Promise<EmployeeResponse> => {
    const res = await axiosClient
      .post('/hr/employees', data);
    return res.data;
  },

  // Link an existing User account to an Employee
  // This gives the employee login access
  linkEmployeeToUser: async (
    employeeId: string,
    userId:     string
  ): Promise<void> => {
    await axiosClient.post(
      `/hr/employees/${employeeId}/link-user`,
      { userId }
    );
  },

  // Remove login access from an employee
  revokeLoginAccess: async (
    employeeId: string
  ): Promise<void> => {
    await axiosClient.delete(
      `/hr/employees/${employeeId}/link-user`
    );
  },

  // ── Leave ────────────────────────────────────────────
  getLeaveBalances: async (
    employeeId: string,
    year?: number
  ): Promise<LeaveBalanceResponse[]> => {
    const res = await axiosClient.get(
      `/hr/employees/${employeeId}/leave-balances`,
      { params: { year } });
    return res.data;
  },

  getLeaveRequests: async (params?: {
    employeeId?: string;
    status?:     string;
    page?:       number;
    pageSize?:   number;
  }): Promise<PaginatedResponse<LeaveRequestResponse>> => {
    const res = await axiosClient.get(
      '/hr/leave', { params });
    return res.data;
  },

  applyLeave: async (
    employeeId: string,
    data: ApplyLeaveRequest
  ): Promise<LeaveRequestResponse> => {
    const res = await axiosClient.post(
      `/hr/employees/${employeeId}/apply-leave`, data);
    return res.data;
  },

  approveLeave: async (leaveId: string): Promise<void> => {
    await axiosClient.put(`/hr/leave/${leaveId}/approve`);
  },
  rejectLeave: async (leaveId: string, rejectionReason: string): Promise<void> => {
    await axiosClient.put(`/hr/leave/${leaveId}/reject`, { rejectionReason });
  },
  cancelLeave: async (leaveId: string): Promise<void> => {
    await axiosClient.put(`/hr/leave/${leaveId}/cancel`);
  },
  getLeaveTypes: async (): Promise<LeaveTypeResponse[]> => {
    return (await axiosClient.get('/hr/leave/types')).data;
  },
  createLeaveType: async (data: { name: string; daysAllowed: number }): Promise<LeaveTypeResponse> => {
    return (await axiosClient.post('/hr/leave/types', data)).data;
  },
  getOverview: async (): Promise<OverviewResponse> => {
    return (await axiosClient.get('/hr/overview')).data;
  },
  exportAttendance: async (params: { from: string; to: string; employeeId?: string }): Promise<Blob> => {
    return (await axiosClient.get('/hr/attendance/export', { params, responseType: 'blob' })).data;
  },

  // ── Attendance ───────────────────────────────────────
  getAttendance: async (params?: {
    employeeId?: string;
    date?:       string;
    page?:       number;
    pageSize?:   number;
  }): Promise<PaginatedResponse<AttendanceResponse>> => {
    const res = await axiosClient.get(
      '/hr/employees/attendance',
      { params });
    return res.data;
  },

  getEmployeeAttendance: async (
    employeeId: string,
    params?: { date?: string; page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<AttendanceResponse>> => {
    const res = await axiosClient.get(`/hr/employees/${employeeId}/attendance`, { params });
    return res.data;
  },

  // Manager/Admin clocks in a SPECIFIC employee
  clockInEmployee: async (
    employeeId: string
  ): Promise<AttendanceResponse> => {
    const res = await axiosClient.post(
      `/hr/employees/${employeeId}/clock-in`);
    return res.data;
  },

  // Manager/Admin clocks out a SPECIFIC employee
  clockOutEmployee: async (
    employeeId: string
  ): Promise<AttendanceResponse> => {
    const res = await axiosClient.post(
      `/hr/employees/${employeeId}/clock-out`);
    return res.data;
  },

  // Employee clocks themselves in
  // No employeeId needed — backend reads from JWT
  selfClockIn: async (): Promise<AttendanceResponse> => {
    const res = await axiosClient.post(
      '/hr/employees/clock-in');
    return res.data;
  },

  // Employee clocks themselves out
  selfClockOut: async (): Promise<AttendanceResponse> => {
    const res = await axiosClient.post(
      '/hr/employees/clock-out');
    return res.data;
  },
};