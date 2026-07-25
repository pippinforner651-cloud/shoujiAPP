// E23跑起来 · Supabase 客户端
// 仅在 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY 同时存在时启用
// 未配置时降级为本地 localStorage 模式

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export const supabaseUrl = SUPABASE_URL;
export const supabaseKey = SUPABASE_KEY;

/** Supabase 是否已配置（前后端均可读） */
export function isSupabaseEnabled(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
}

/** 创建 Supabase 客户端（惰性） */
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!isSupabaseEnabled()) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        storageKey: 'e23_sb_auth_v1',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return _client;
}

/** 获取当前认证会话 */
export async function getCurrentSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.auth.getSession();
  if (error) return null;
  return data.session;
}

/** 监听认证状态变化 */
export function onAuthChange(callback: (event: string, session: unknown) => void) {
  const sb = getSupabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => data?.subscription?.unsubscribe();
}
