import { buildApiUrl as buildUrl, API_CONFIG } from '../config/api.config';

export const getApiUrl = (): string => {
  return API_CONFIG.BASE_URL;
};

export const buildApiUrl = (endpoint: string): string => {
  return buildUrl(endpoint);
};

export const buildQueryString = (params: Record<string, unknown>): string => {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return filtered ? `?${filtered}` : '';
};

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
    this.data   = data;
  }
}

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};