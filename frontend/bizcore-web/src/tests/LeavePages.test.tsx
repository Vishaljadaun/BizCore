import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyLeavePage from '../modules/hr/leaves/MyLeavePage';
import CompanyAdminDashboard from '../modules/dashboard/CompanyAdminDashboard';
import { hrApi } from '../api/hrApi';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';
vi.mock('../api/hrApi', () => ({ hrApi: { getMyProfile: vi.fn(), getLeaveBalances: vi.fn(), getLeaveRequests: vi.fn(), applyLeave: vi.fn(), getOverview: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ user: { id: 'u', companyId: 'c', firstName: 'Test', lastName: 'User', email: 'test@example.com', role: UserRole.Employee, companyName: 'Test', isActive: true } });
  vi.mocked(hrApi.getMyProfile).mockResolvedValue({ id: 'employee', employeeCode: 'E1', firstName: 'Test', lastName: 'User', fullName: 'Test User', email: 'test@example.com', phone: null, designation: 'Developer', departmentId: 'd', departmentName: 'Engineering', joiningDate: '2026-01-01', salary: 0, isActive: true, userId: 'u', createdAt: '' });
  vi.mocked(hrApi.getLeaveBalances).mockResolvedValue([{ leaveTypeId: 'annual', leaveTypeName: 'Annual', year: new Date().getUTCFullYear(), totalDays: 10, usedDays: 2, pendingDays: 3, availableDays: 5, remainingDays: 8 }]);
  vi.mocked(hrApi.getLeaveRequests).mockResolvedValue({ items: [], page: 1, pageSize: 10, totalPages: 0, totalCount: 0 });
});
afterEach(cleanup);
it('preserves a failed application and shows reserved balance accurately', async () => {
  vi.mocked(hrApi.applyLeave).mockRejectedValue({ isAxiosError: true, response: { data: { message: 'An existing request overlaps these dates.' } } });
  render(<MemoryRouter><MyLeavePage /></MemoryRouter>);
  expect(await screen.findByText('2 used · 3 pending · 10 total')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Leave type'), { target: { value: 'annual' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Medical appointment' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  expect((await screen.findByRole('alert')).textContent).toContain('overlaps');
  expect((screen.getByLabelText('Reason') as HTMLTextAreaElement).value).toBe('Medical appointment');
  expect(hrApi.applyLeave).toHaveBeenCalledWith('employee', expect.objectContaining({ leaveTypeId: 'annual', reason: 'Medical appointment' }));
});
it('does not describe a network failure as a missing employee profile', async () => {
  vi.mocked(hrApi.getMyProfile).mockRejectedValue(new Error('Offline'));
  render(<MemoryRouter><MyLeavePage /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('No employee profile linked')).toBeNull();
});
it('shows a dashboard failure instead of invented zero metrics and can recover', async () => {
  useAuthStore.setState({ user: { ...useAuthStore.getState().user!, role: UserRole.CompanyAdmin } });
  vi.mocked(hrApi.getOverview).mockRejectedValueOnce(new Error('Offline'));
  render(<MemoryRouter><CompanyAdminDashboard /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByLabelText('Overview metrics')).toBeNull();
  vi.mocked(hrApi.getOverview).mockResolvedValue({ scope: 'company', date: '2026-10-11', activeEmployees: 7, departments: 2, clockInsToday: 4, pendingRequests: 2, onLeaveToday: 1, attendanceDaysThisMonth: 0, approvedDaysThisYear: 0, hasEmployeeProfile: false });
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.getByLabelText('Overview metrics')).toBeTruthy());
  expect(screen.getByText('7')).toBeTruthy();
});

it('labels the balance year selector and fetches the selected annual balance', async () => {
  render(<MemoryRouter><MyLeavePage /></MemoryRouter>);
  const selector = await screen.findByLabelText('Balance year', { exact: true });
  const nextYear = new Date().getUTCFullYear() + 1;
  fireEvent.change(selector, { target: { value: String(nextYear) } });
  await waitFor(() => expect(hrApi.getLeaveBalances).toHaveBeenCalledWith('employee', nextYear));
});
