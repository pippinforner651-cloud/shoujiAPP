/**
 * 云用户服务（真实 API）
 *
 * 通过 apiClient 调用后端 /v1/users 接口。
 * 后端不可用时自动回退到 Mock 模式。
 */
import { get, post } from './apiClient';

const BASE = '/users';

/** 云端用户响应 */
export interface CloudUser {
  id: string;
  nickname: string;
  avatar: string;
  level: number;
  experience: number;
  createdAt: string;
  lastLoginAt: string;
  totalDistanceKm?: number;
  runCount?: number;
}

/** 注册或更新用户（upsert） */
export async function registerUser(id: string, nickname?: string, avatar?: string, isGuest?: boolean): Promise<CloudUser> {
  const res = await post<CloudUser>(BASE, { id, nickname, avatar, is_guest: isGuest });
  if (res.success && res.data) return res.data;
  // Mock fallback
  return {
    id,
    nickname: nickname || '跑者',
    avatar: avatar || '🏃',
    level: 1,
    experience: 0,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
}

/** 获取用户信息 */
export async function fetchUser(id: string): Promise<CloudUser | null> {
  const res = await get<CloudUser>(`${BASE}/${id}`);
  if (res.success && res.data) return res.data;
  return null;
}

/** 上传用户档案 */
export async function uploadProfile(account: { id: string; nickname: string; avatar: string; isGuest?: boolean }): Promise<boolean> {
  const res = await post(BASE, {
    id: account.id,
    nickname: account.nickname,
    avatar: account.avatar,
    is_guest: account.isGuest,
  });
  return res.success;
}
