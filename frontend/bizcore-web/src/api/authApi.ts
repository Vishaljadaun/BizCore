import axiosClient from './axiosClient';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';

// Why a separate API file?
// Components should NOT directly call axios
// They should call these typed functions
// Benefits:
// - All auth API calls in one place
// - TypeScript enforces correct request/response shapes
// - Easy to find: "Where do we call login?" → authApi.login()
// - Easy to mock in tests

export const authApi = {

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>(
      '/auth/register',
      data
    );
    return response.data;
    // axiosClient.post<AuthResponse> tells TypeScript:
    // "The response body will be of type AuthResponse"
    // response.data = just the body (not headers, status, etc.)
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
    // void = we don't care about the response body
  },

  me: async () => {
    const response = await axiosClient.get('/auth/me');
    return response.data;
  },
};