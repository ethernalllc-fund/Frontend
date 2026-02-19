import { buildApiUrl, API_CONFIG, DEFAULT_HEADERS } from '@/config/api.config';
import { ApiError } from '@/lib/api';

type QueryParamValue = string | number | boolean | null | undefined;

interface RequestConfig extends RequestInit {
  params?: Record<string, QueryParamValue>;
  timeout?: number;
}

export class BaseApiClient {
  private authToken: string | null = null;
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  private buildHeaders(customHeaders?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      ...(DEFAULT_HEADERS as Record<string, string>),
      ...(customHeaders as Record<string, string>),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  private buildQueryString(params?: Record<string, QueryParamValue>): string {
    if (!params) return '';
    const filtered = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    return filtered ? `?${filtered}` : '';
  }

  private async fetchWithTimeout(
    url: string,
    config: RequestInit,
    timeout: number = API_CONFIG.TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('❌ Request timeout:', url);
          throw new ApiError(
            `Request timeout - Server took longer than ${timeout}ms to respond. Please check if the backend is running.`,
            408
          );
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          console.error('❌ Network error:', url);
          throw new ApiError(
            'Cannot connect to server. Please ensure the backend is running at ' +
              (import.meta.env.VITE_API_URL || 'http://localhost:3001'),
            0
          );
        }
      }
      throw error;
    }
  }

  async request<T = unknown>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { params, timeout, ...fetchConfig } = config;
    const url = buildApiUrl(endpoint) + this.buildQueryString(params);
    const headers = this.buildHeaders(config.headers);

    console.log('🌐 API Request:', {
      method: fetchConfig.method ?? 'GET',
      url,
      hasAuth: !!this.authToken,
    });

    try {
      const response = await this.fetchWithTimeout(
        url,
        { ...fetchConfig, headers },
        timeout
      );

      console.log('📡 API Response:', {
        status: response.status,
        ok: response.ok,
        url,
      });

      if (!response.ok) {
        let errorData: { detail?: string };
        try {
          errorData = (await response.json()) as { detail?: string };
        } catch {
          errorData = { detail: response.statusText };
        }

        throw new ApiError(
          errorData.detail ?? `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      if (response.status === 204) {
        return null as T;
      }

      const data = (await response.json()) as T;
      console.log('✅ API Success:', { url, data });
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('❌ Network error:', error);
      throw new ApiError(
        'Network error. Please check your connection and ensure the backend is running.',
        0,
        error
      );
    }
  }

  async get<T = unknown>(
    endpoint: string,
    params?: Record<string, QueryParamValue>,
    config?: Omit<RequestConfig, 'params'>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'GET',
      params,
    });
  }

  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = unknown>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
    });
  }
}

export const apiClient = new BaseApiClient();