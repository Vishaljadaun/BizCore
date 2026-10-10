import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import MyProfilePage from '../modules/hr/employees/MyProfilePage';
import AppRoutes from '../routes/AppRoutes';
import { hrApi } from '../api/hrApi';
import { navigation } from '../config/navigation';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';

vi.mock('../api/hrApi', () => ({ hrApi: { getMyProfile: vi.fn(), getLeaveBalances: vi.fn(),
  getEmployeeAttendance: vi.fn(), getAttendance: vi.fn(), selfClockIn: vi.fn(), selfClockOut: vi.fn() } }));
vi.mock('../components/layout/AppLayout', () => ({ default: () => <Outlet /> }));
const profile = { id: 'employee-1', fullName: 'Test Employee', firstName: 'Test', lastName: 'Employee',
  employeeCode: 'EMP001', email: 'test@example.com', departmentName: 'Engineering', designation: 'Developer',
  joiningDate: '2026-01-01', phone: null, salary: 0, isActive: true, departmentId: 'dept', userId: 'user', createdAt: '' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(hrApi.getMyProfile).mockResolvedValue(profile);
  vi.mocked(hrApi.getLeaveBalances).mockResolvedValue([]);
  vi.mocked(hrApi.getEmployeeAttendance).mockResolvedValue({ items: [], page: 1, pageSize: 1, totalCount: 0, totalPages: 0 });
});
afterEach(cleanup);

it('lets an Employee open their profile route and find it in navigation', async () => {
  useAuthStore.setState({ isAuthenticated: true, user: { id: 'user', firstName: 'Test', lastName: 'Employee',
    email: '', role: UserRole.Employee, isActive: true, companyId: 'company', companyName: 'Test' } });
  render(<MemoryRouter initialEntries={['/my-profile']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByText('Test Employee')).toBeTruthy();
  expect(navigation.find(item => item.path === '/my-profile')?.roles).toContain(UserRole.Employee);
  expect(hrApi.getAttendance).not.toHaveBeenCalled();
  expect(hrApi.getEmployeeAttendance).toHaveBeenCalledWith('employee-1', expect.objectContaining({ pageSize: 1 }));
});

it('distinguishes an unlinked profile from a server error and supports retry', async () => {
  vi.mocked(hrApi.getMyProfile).mockRejectedValueOnce(new Error('Network unavailable'));
  render(<MyProfilePage />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('No Employee Profile Linked')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Test Employee')).toBeTruthy();
});

it('shows the unlinked message only for a missing profile', async () => {
  vi.mocked(hrApi.getMyProfile).mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
  render(<MyProfilePage />);
  expect(await screen.findByText('No Employee Profile Linked')).toBeTruthy();
});

it('preserves the profile but prevents clock actions when attendance cannot load', async () => {
  vi.mocked(hrApi.getEmployeeAttendance).mockRejectedValue(new Error('Offline'));
  render(<MyProfilePage />);
  expect(await screen.findByText('Test Employee')).toBeTruthy();
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Clock In/ })).toBeNull();
});

it('shows a clock-in failure and allows another attempt', async () => {
  vi.mocked(hrApi.selfClockIn).mockRejectedValueOnce({ isAxiosError: true, response: { data: { message: 'Already clocked in for today.' } } });
  render(<MyProfilePage />);
  fireEvent.click(await screen.findByRole('button', { name: /Clock In/ }));
  expect(await screen.findByText('Already clocked in for today.')).toBeTruthy();
  expect((screen.getByRole('button', { name: /Clock In/ }) as HTMLButtonElement).disabled).toBe(false);
});
