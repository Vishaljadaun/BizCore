import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { AuthResponse } from '../types';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const axiosClient = axios.create({ baseURL, timeout: 30000 });
// A separate client prevents failed refreshes from entering the interceptor again.
const tokenClient = axios.create({ baseURL, timeout: 30000 });
type RetryRequest = InternalAxiosRequestConfig & { _retry?: boolean; _sessionRevision?: number };
let refreshing: { token: string; promise: Promise<string> } | null = null;

axiosClient.interceptors.request.use((config) => {
  const { accessToken, sessionRevision } = useAuthStore.getState();
  const request = config as RetryRequest;
  if (request._sessionRevision !== undefined && request._sessionRevision !== sessionRevision) {
    throw new axios.CanceledError('The session changed before this request could be sent.');
  }
  request._sessionRevision ??= sessionRevision;
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  else delete config.headers.Authorization;
  return config;
});

axiosClient.interceptors.response.use(response => response, async (error: AxiosError) => {
  const request = error.config as RetryRequest | undefined;
  // Invalid login credentials belong on the login form, not in a refresh loop.
  if (!request || error.response?.status !== 401 || request._retry ||
      /\/auth\/(login|register|refresh|logout)(?:\?|$)/.test(request.url || '')) {
    return Promise.reject(error);
  }
  request._retry = true;
  const session = useAuthStore.getState();
  if (request._sessionRevision !== session.sessionRevision) {
    throw new axios.CanceledError('The session changed before this response arrived.');
  }
  if (!session.accessToken || !session.refreshToken) {
    session.logout();
    return Promise.reject(error);
  }

  // A delayed 401 may belong to the token a concurrent request already renewed.
  if (request.headers.Authorization !== `Bearer ${session.accessToken}`) {
    return axiosClient(request);
  }

  const refreshToken = session.refreshToken;
  if (!refreshing || refreshing.token !== refreshToken) {
    const promise = tokenClient.post<AuthResponse>('/auth/refresh', {
      accessToken: session.accessToken, refreshToken,
    }).then(({ data }) => {
      // Never restore a session after logout or overwrite a newer login.
      if (useAuthStore.getState().refreshToken !== refreshToken) {
        throw new axios.CanceledError('The session changed during token refresh.');
      }
      useAuthStore.getState().renewSession(data);
      return data.accessToken;
    }).catch((refreshError: unknown) => {
      if (useAuthStore.getState().refreshToken === refreshToken) {
        useAuthStore.getState().logout();
      }
      throw refreshError;
    }).finally(() => {
      if (refreshing?.promise === promise) refreshing = null;
    });
    refreshing = { token: refreshToken, promise };
  }
  const accessToken = await refreshing.promise;
  if (useAuthStore.getState().accessToken !== accessToken) {
    throw new axios.CanceledError('The session changed before the request could retry.');
  }
  request.headers.Authorization = `Bearer ${accessToken}`;
  return axiosClient(request);
});

export default axiosClient;
