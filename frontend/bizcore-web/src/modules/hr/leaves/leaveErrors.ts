import { isAxiosError } from 'axios';
export function errorMessage(error: unknown, fallback = 'Unable to save your changes. Please retry.') {
  return isAxiosError(error) && typeof error.response?.data?.message === 'string'
    ? error.response.data.message : fallback;
}
