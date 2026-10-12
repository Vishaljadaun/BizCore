import axios from 'axios';
export function errorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.errors && typeof data.errors === 'object') return Object.values(data.errors).flat().join(' ');
    return data?.message || 'Unable to complete the request. Please retry.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please retry.';
}
