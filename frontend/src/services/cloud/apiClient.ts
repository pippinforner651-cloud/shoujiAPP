/**
 * REST API 客户端
 *
 * 统一 HTTP 请求封装。
 * 当前为 Mock 实现，切换真实后端时只需修改 BASE_URL。
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
  const url = `${BASE_URL}${path}`;

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    if (!BASE_URL) {
      // Mock 模式：不发送真实请求，打印日志
      console.log(`[API/Mock] ${method} ${url}`, body || '');
      return {
        success: true,
        statusCode: 200,
        data: undefined as unknown as T,
      };
    }

    const response = await fetch(url, options);
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
