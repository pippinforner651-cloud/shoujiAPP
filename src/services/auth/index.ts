// E23跑起来 · Auth 服务
// Supabase Auth 封装：注册 / 登录 / 登出 / 会话管理

import { getSupabase, getCurrentSession, onAuthChange, isSupabaseEnabled } from '../../lib/supabase';

export type AuthResult =
  | { ok: true; userId: string; profile: Record<string, unknown> }
  | { ok: false; error: string };

export type AuthEventCallback = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED', userId?: string) => void;

const AUTH_CALLBACKS = new Set<AuthEventCallback>();

export function onAuthEvent(cb: AuthEventCallback) {
  AUTH_CALLBACKS.add(cb);
  return () => AUTH_CALLBACKS.delete(cb);
}

function notify(event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED', userId?: string) {
  AUTH_CALLBACKS.forEach((cb) => { try { cb(event, userId); } catch { /* ignore */ } });
}

export function canUseCloudAuth(): boolean {
  return isSupabaseEnabled();
}

/** 从手机号生成内部邮箱（手机号注册，邮箱仅用于 Supabase Auth 内部） */
function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `phone_${digits}@e23.preview`;
}

/** 注册新用户 */
export async function signUp(phone: string, password: string, nickname: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未配置' };
  const email = phoneToEmail(phone);
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: '注册失败：未返回用户' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: pe } = await (sb.from('profiles') as any).insert({ id: data.user.id, nickname, phone, role: 'member', status: 'pending' });
  if (pe) return { ok: false, error: `profile 创建失败: ${pe.message}` };

  notify('SIGNED_IN', data.user.id);
  return { ok: true, userId: data.user.id, profile: { id: data.user.id, nickname, phone } };
}

/** 登录 */
export async function signIn(phone: string, password: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Supabase 未配置' };
  const email = phoneToEmail(phone);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (sb.from('profiles') as any).select('*').eq('id', data.user.id).single();
  if (!profile) return { ok: false, error: '未找到用户资料' };
  notify('SIGNED_IN', data.user.id);
  return { ok: true, userId: data.user.id, profile: profile as Record<string, unknown> };
}

/** 登出 */
export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
  notify('SIGNED_OUT');
}

/** 获取当前用户和资料 */
export async function getCurrentProfile(): Promise<{ user: { id: string; email?: string }; profile: Record<string, unknown> } | null> {
  const session = await getCurrentSession();
  if (!session?.user) return null;
  const sb = getSupabase();
  if (!sb) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (sb.from('profiles') as any).select('*').eq('id', session.user.id).single();
  if (!profile) return null;
  return { user: { id: session.user.id, email: session.user.email }, profile: profile as Record<string, unknown> };
}

/** 加入 E23 班级 */
export async function joinE23Class(userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cls } = await (sb.from('classes') as any).select('id').eq('name', 'E23').single();
  if (!cls) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (sb.from('class_members') as any).select('id').eq('user_id', userId).eq('class_id', cls.id).maybeSingle();
  if (existing) return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (sb.from('class_members') as any).insert({ class_id: cls.id, user_id: userId, role: 'member' });
  if (error) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('profiles') as any).update({ class_id: cls.id }).eq('id', userId);
  return true;
}

// 初始化：监听认证状态变化
onAuthChange((event) => {
  if (event === 'SIGNED_IN') notify('SIGNED_IN');
  if (event === 'SIGNED_OUT') notify('SIGNED_OUT');
  if (event === 'TOKEN_REFRESHED') notify('TOKEN_REFRESHED');
});
