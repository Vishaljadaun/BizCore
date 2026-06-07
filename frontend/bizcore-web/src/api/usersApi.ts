import axiosClient from './axiosClient';
import type {
  UserResponse,
  PaginatedResponse,
  CreateUserRequest,
  UpdateUserRequest,
} from '../types';

// Query params shape for get users
interface GetUsersParams {
  search?:   string;
  role?:     string;
  isActive?: boolean;
  page?:     number;
  pageSize?: number;
}

export const usersApi = {

  getUsers: async (
    params: GetUsersParams = {}
  ): Promise<PaginatedResponse<UserResponse>> => {

    const response = await axiosClient.get<PaginatedResponse<UserResponse>>(
      '/users',
      { params }
      // { params } = query string mein jaata hai automatically
      // GET /api/users?search=john&page=1&pageSize=10
    );

    return response.data;
  },

  getUserById: async (id: string): Promise<UserResponse> => {
    const response = await axiosClient
      .get<UserResponse>(`/users/${id}`);
    return response.data;
  },

  createUser: async (
    data: CreateUserRequest
  ): Promise<UserResponse> => {
    const response = await axiosClient
      .post<UserResponse>('/users', data);
    return response.data;
  },

  updateUser: async (
    id:   string,
    data: UpdateUserRequest
  ): Promise<UserResponse> => {
    const response = await axiosClient
      .put<UserResponse>(`/users/${id}`, data);
    return response.data;
  },

  changeRole: async (
    id:   string,
    role: string
  ): Promise<void> => {
    await axiosClient.put(`/users/${id}/role`, { role });
  },

  toggleStatus: async (
    id: string
  ): Promise<{ isActive: boolean; message: string }> => {
    const response = await axiosClient
      .put(`/users/${id}/toggle`);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await axiosClient.delete(`/users/${id}`);
  },
};