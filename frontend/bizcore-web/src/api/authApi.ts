import axiosClient from './axiosClient';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';

export const authApi = {

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>(
      '/auth/register',
      data
    );
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>(
      '/auth/login',
      data
    );
    return response.data;
  },

  refresh: async (
    accessToken:  string,
    refreshToken: string
  ): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>(
      '/auth/refresh',
      { accessToken, refreshToken }
    );
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await axiosClient.post('/auth/logout', refreshToken);
  },

  // Backend now also returns employeeId in claims
  // Frontend reads this via /auth/me if needed for refresh
  me: async () => {
    const response = await axiosClient.get('/auth/me');
    return response.data;
  },
};