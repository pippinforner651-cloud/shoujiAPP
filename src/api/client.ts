// E23跑起来 · API 客户端
// 后端地址由 VITE_API_BASE_URL 注入；未配置时 isApiEnabled()=false，App 保持本机模式。

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'e23_token_v1';

export function isApiEnabled(): boolean {
  return BASE.length > 0;
}
export function apiBase(): string {
  return BASE;
}

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* 隐私模式下静默 */ }
}

export class ApiError extends Error {
  code: string;
  status: number;
  offline: boolean;
  constructor(message: string, code: string, status: number, offline = false) {
    super(message);
    this.code = code;
    this.status = status;
    this.offline = offline;
  }
}

interface ReqOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean; // 默认 true：附带 token
}

export async function apiFetch<T>(path: string, opts: ReqOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // 网络不可达：统一标记为离线，由调用方决定降级或入队
    throw new ApiError('网络不可达（离线或后端未启动）', 'OFFLINE', 0, true);
  }

  let data: unknown = null;
  try { data = await res.json(); } catch { /* 空响应 */ }

  if (!res.ok) {
    const d = data as { error?: string; message?: string } | null;
    throw new ApiError(d?.message ?? `请求失败(${res.status})`, d?.error ?? 'HTTP_' + res.status, res.status);
  }
  return data as T;
}
