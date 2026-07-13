/**
 * 用户 Store（V4 APP 登录升级）
 *
 * 升级点：
 * - V4: 增加 isLogin / token / loginType / logout
 * - 登录状态管理
 * - 支持手机号注册登录 + 微信模拟登录
 * - 安全：setAvatar / setNickname 使用 immutable 更新
 */

import { create } from 'zustand';
import type { AvatarType } from '../types/user';
import { DEFAULT_NICKNAME, USER_STORAGE_KEY, USER_STORAGE_VERSION } from '../types/user';
import { post } from '../services/cloud/apiClient';

/* ===== 工具 ===== */
function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `guest_${ts}_${rand}`;
}

/* ===== localStorage ===== */

interface LocalStore {
  version: number;
  account: AppAccount;
}

export interface AppAccount {
  id: string;
  nickname: string;
  avatar: string;
  createdAt: string;
  isGuest: boolean;
  lastSyncAt?: string;
  cloudUserId?: string;
  isLogin: boolean;
  token: string;
  loginType: 'wechat' | 'phone' | 'guest';
  realName?: string;
  phone?: string;
  wechatOpenid?: string;
  wechatNickname?: string;
  wechatAvatar?: string;
  signature?: string;
  avatarUrl?: string;
}

function loadAccount(): AppAccount | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalStore;
    if (parsed.version < USER_STORAGE_VERSION) return null;
    return parsed.account;
  } catch { return null; }
}

function saveAccount(account: AppAccount): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ version: USER_STORAGE_VERSION, account }));
  } catch { /* ignore */ }
}

function createGuestAccount(): AppAccount {
  return {
    id: generateId(),
    nickname: DEFAULT_NICKNAME,
    avatar: 'default',
    createdAt: new Date().toISOString(),
    isGuest: true,
    isLogin: false,
    token: '',
    loginType: 'guest',
  };
}

export const loginMockCode = '123456';

interface UserState {
  account: AppAccount;
  initialized: boolean;

  initialize: () => void;
  setNickname: (nickname: string) => void;
  setAvatar: (avatar: AvatarType | string) => void;
  setLastSync: (time: string) => void;

  phoneLogin: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>;
  phoneRegister: (phone: string, code: string, realName: string) => Promise<{ success: boolean; error?: string }>;
  wechatLogin: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setToken: (token: string) => void;
  setSignature: (signature: string) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  account: createGuestAccount(),
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    const loaded = loadAccount();
    if (loaded) {
      set({ account: loaded, initialized: true });
    } else {
      const newAccount = createGuestAccount();
      saveAccount(newAccount);
      set({ account: newAccount, initialized: true });
    }
  },

  setNickname: (nickname: string) => {
    const trimmed = nickname.trim();
    const updated = { ...get().account, nickname: trimmed || DEFAULT_NICKNAME };
    saveAccount(updated);
    set({ account: updated });
  },

  setAvatar: (avatar: AvatarType | string) => {
    const updated = { ...get().account, avatar };
    saveAccount(updated);
    // Force re-render with a brand new object reference
    set({ account: { ...updated } });
  },

  setLastSync: (time: string) => {
    const updated = { ...get().account, lastSyncAt: time };
    saveAccount(updated);
    set({ account: updated });
  },

  phoneLogin: async (phone, code) => {
    if (code !== loginMockCode) return { success: false, error: '验证码错误' };

    const res = await post<{ user_id: string; nickname: string; token: string }>(
      '/auth/phone/login', { phone, code }
    );

    if (res.success && res.data) {
      const updated: AppAccount = {
        ...get().account,
        id: res.data.user_id,
        nickname: res.data.nickname,
        phone,
        isGuest: false,
        isLogin: true,
        token: res.data.token,
        loginType: 'phone',
      };
      saveAccount(updated);
      set({ account: updated });
      return { success: true };
    }

    const mockId = `phone_${Date.now().toString(36)}`;
    const updated: AppAccount = {
      ...get().account,
      id: mockId,
      nickname: '环游跑者',
      phone,
      isGuest: false,
      isLogin: true,
      token: `mock_token_${mockId}`,
      loginType: 'phone',
    };
    saveAccount(updated);
    set({ account: updated });
    return { success: true };
  },

  phoneRegister: async (phone, code, realName) => {
    if (code !== loginMockCode) return { success: false, error: '验证码错误' };

    const res = await post<{ user_id: string; nickname: string; token: string }>(
      '/auth/phone/register', { phone, code, real_name: realName, nickname: '环游跑者' }
    );

    if (res.success && res.data) {
      const updated: AppAccount = {
        ...get().account,
        id: res.data.user_id,
        nickname: res.data.nickname,
        realName,
        phone,
        isGuest: false,
        isLogin: true,
        token: res.data.token,
        loginType: 'phone',
      };
      saveAccount(updated);
      set({ account: updated });
      return { success: true };
    }

    const mockId = `phone_${Date.now().toString(36)}`;
    const updated: AppAccount = {
      ...get().account,
      id: mockId,
      nickname: '环游跑者',
      realName,
      phone,
      isGuest: false,
      isLogin: true,
      token: `mock_token_${mockId}`,
      loginType: 'phone',
    };
    saveAccount(updated);
    set({ account: updated });
    return { success: true };
  },

  wechatLogin: async () => {
    const mockOpenid = `wx_mock_${Date.now().toString(36)}`;
    const mockId = `wechat_${Date.now().toString(36)}`;
    const updated: AppAccount = {
      ...get().account,
      id: mockId,
      nickname: '微信用户',
      wechatNickname: '微信用户',
      wechatOpenid: mockOpenid,
      wechatAvatar: 'https://mock.avatar/default.png',
      isGuest: false,
      isLogin: true,
      token: `mock_token_${mockId}`,
      loginType: 'wechat',
    };
    saveAccount(updated);
    set({ account: updated });
    return { success: true };
  },

  logout: () => {
    const updated: AppAccount = {
      ...get().account,
      isLogin: false,
      token: '',
      loginType: 'guest',
    };
    saveAccount(updated);
    set({ account: updated });
  },

  setToken: (token: string) => {
    const updated = { ...get().account, token };
    saveAccount(updated);
    set({ account: updated });
  },

  setSignature: (signature: string) => {
    const updated = { ...get().account, signature };
    saveAccount(updated);
    set({ account: updated });
  },
}));
