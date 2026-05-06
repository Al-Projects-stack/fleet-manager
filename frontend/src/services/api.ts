import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { ApiResponse } from '../types/api';

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach stored JWT to every outbound request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Force logout on 401 — token expired or revoked
apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError && error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
