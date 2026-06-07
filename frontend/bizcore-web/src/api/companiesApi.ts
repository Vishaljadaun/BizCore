import axiosClient from './axiosClient';
import type {
  CompanyResponse,
  PlatformStats,
  PaginatedResponse,
  UserResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from '../types';

interface GetCompaniesParams {
  search?:   string;
  status?:   string;
  page?:     number;
  pageSize?: number;
}

export const companiesApi = {

  getStats: async (): Promise<PlatformStats> => {
    const response = await axiosClient
      .get<PlatformStats>('/companies/stats');
    return response.data;
  },

  getCompanies: async (
    params: GetCompaniesParams = {}
  ): Promise<PaginatedResponse<CompanyResponse>> => {
    const response = await axiosClient
      .get<PaginatedResponse<CompanyResponse>>(
        '/companies', { params });
    return response.data;
  },

  getCompanyById: async (
    id: string
  ): Promise<CompanyResponse> => {
    const response = await axiosClient
      .get<CompanyResponse>(`/companies/${id}`);
    return response.data;
  },

  getCompanyUsers: async (
    id:       string,
    page:     number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<UserResponse>> => {
    const response = await axiosClient
      .get<PaginatedResponse<UserResponse>>(
        `/companies/${id}/users`,
        { params: { page, pageSize } }
      );
    return response.data;
  },

  createCompany: async (
    data: CreateCompanyRequest
  ): Promise<CompanyResponse> => {
    const response = await axiosClient
      .post<CompanyResponse>('/companies', data);
    return response.data;
  },

  updateCompany: async (
    id:   string,
    data: UpdateCompanyRequest
  ): Promise<CompanyResponse> => {
    const response = await axiosClient
      .put<CompanyResponse>(`/companies/${id}`, data);
    return response.data;
  },

  toggleCompany: async (
    id: string
  ): Promise<{ isActive: boolean; message: string }> => {
    const response = await axiosClient
      .put(`/companies/${id}/toggle`);
    return response.data;
  },
};