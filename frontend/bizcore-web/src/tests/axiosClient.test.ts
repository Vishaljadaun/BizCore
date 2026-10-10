import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { UserRole, type AuthResponse } from '../types';

const mocks = vi.hoisted(() => ({ api: vi.fn(), refresh: vi.fn(), clients: 0 }));
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, create: (config: object) => {
    const client = actual.default.create(config);
    client.defaults.adapter = mocks.clients++ === 0 ? mocks.api : mocks.refresh;
    return client;
  } } };
});
import client from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';

const auth = (token = 'old'): AuthResponse => ({ accessToken: token, refreshToken: `${token}-refresh`,
  accessTokenExpiry: '2030-01-01', user: { id: 'user', companyId: 'company', companyName: 'Company',
    firstName: 'Test', lastName: 'Employee', email: 'test@example.com', role: UserRole.Employee, isActive: true } });
const response = (config: InternalAxiosRequestConfig, data: unknown) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
const unauthorized = (config: InternalAxiosRequestConfig) => Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null,
  { config, data: { message: 'Invalid credentials' }, status: 401, statusText: 'Unauthorized', headers: {} }));
beforeEach(() => { mocks.api.mockReset(); mocks.refresh.mockReset(); useAuthStore.getState().logout(); });

describe('authentication recovery', () => {
  it('returns a bad login to the form without attempting refresh', async () => {
    useAuthStore.getState().login(auth());
    mocks.api.mockImplementation(unauthorized);
    await expect(client.post('/auth/login', {})).rejects.toMatchObject({ response: { status: 401 } });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('does not leave refresh stuck after a request without a stored refresh token', async () => {
    mocks.api.mockImplementation(unauthorized);
    await expect(client.get('/users')).rejects.toBeDefined();
    useAuthStore.getState().login(auth());
    mocks.api.mockImplementation(config => config.headers.Authorization === 'Bearer new'
      ? Promise.resolve(response(config, [])) : unauthorized(config));
    mocks.refresh.mockImplementation(config => Promise.resolve(response(config, auth('new'))));
    await expect(client.get('/users')).resolves.toMatchObject({ status: 200 });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('shares one refresh for parallel expired requests and retries them once', async () => {
    useAuthStore.getState().login(auth());
    mocks.api.mockImplementation(config => config.headers.Authorization === 'Bearer new'
      ? Promise.resolve(response(config, [])) : unauthorized(config));
    let release!: () => void;
    mocks.refresh.mockImplementation(config => new Promise(resolve => {
      release = () => resolve(response(config, auth('new')));
    }));
    const requests = [client.get('/users'), client.get('/companies')];
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    release();
    await expect(Promise.all(requests)).resolves.toHaveLength(2);
    expect(mocks.api).toHaveBeenCalledTimes(4);
  });

  it('rejects all waiting requests when refresh fails and allows a later login', async () => {
    useAuthStore.getState().login(auth());
    mocks.api.mockImplementation(unauthorized);
    mocks.refresh.mockImplementation(unauthorized);
    const result = await Promise.allSettled([client.get('/users'), client.get('/companies')]);
    expect(result.every(r => r.status === 'rejected')).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    useAuthStore.getState().login(auth('later'));
    mocks.api.mockImplementation(config => Promise.resolve(response(config, [])));
    await expect(client.get('/users')).resolves.toMatchObject({ status: 200 });
  });

  it('does not restore a session that was logged out during refresh', async () => {
    useAuthStore.getState().login(auth());
    mocks.api.mockImplementation(unauthorized);
    let release!: () => void;
    mocks.refresh.mockImplementation(config => new Promise(resolve => {
      release = () => resolve(response(config, auth('new')));
    }));
    const pending = client.get('/users');
    const assertion = expect(pending).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    useAuthStore.getState().logout();
    release();
    await assertion;
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mocks.api).toHaveBeenCalledTimes(1);
  });

  it('does not retry endlessly when a renewed token is also rejected', async () => {
    useAuthStore.getState().login(auth());
    mocks.api.mockImplementation(unauthorized);
    mocks.refresh.mockImplementation(config => Promise.resolve(response(config, auth('new'))));
    await expect(client.get('/users')).rejects.toBeDefined();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.api).toHaveBeenCalledTimes(2);
  });
});
