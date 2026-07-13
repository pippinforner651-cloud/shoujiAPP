/**
 * REST API 客户端
 *
 * Phase 6.3.2 — 统一使用 config/api.ts 中的 API_BASE_URL。
 * - 开发环境无 VITE_API_BASE_URL → Mock 模式
 * - 生产环境有 VITE_API_BASE_URL → 真实 HTTPS 请求
 */

import { API_BASE_URL, REQUEST_TIMEOUT } from '../../config/api';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

/** 通用请求方法 */
async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    if (!API_BASE_URL || API_BASE_URL === 'http://localhost:3001') {
      // Mock 模式：不发送真实请求，打印日志
      console.log(`[API/Mock] ${method} ${url}`, body || '');
      clearTimeout(timeoutId);
      return {
        success: true,
        statusCode: 200,
        data: undefined as unknown as T,
      };
    }

    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    const json = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: json.error || `HTTP ${response.status}`,
        statusCode: response.status,
      };
    }

    return {
      success: true,
      data: json as T,
      statusCode: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
      statusCode: 0,
    };
  }
}

/** GET 请求 */
export function get<T>(path: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
  return request<T>('GET', path, undefined, headers);
}

/** POST 请求 */
export function post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
  return request<T>('POST', path, body, headers);
}

/** PUT 请求 */
export function put<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> {
  return request<T>('PUT', path, body, headers);
}

/** DELETE 请求 */
export function del<T>(path: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
  return request<T>('DELETE', path, undefined, headers);
}
