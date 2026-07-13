/* 用户基础类型 */

/** 用户头像类型 */
export type AvatarType = 'default' | 'runner' | 'climber' | 'explorer' | 'cyclist' | 'wechat';

/** 微信用户信息 */
export interface WechatUser {
  openid: string;
  unionid?: string;
  nickname: string;
  avatar: string;
}

/** APP 个人资料 */
export interface AppProfile {
  appNickname: string;
  appAvatar: string;
  signature: string;
  rankVisibility: boolean;
}

/** 用户账户（V3 升级） */
export interface UserAccount {
  /** 用户唯一 ID */
  id: string;
  /** 用户昵称 */
  nickname: string;
  /** 头像类型 */
  avatar: AvatarType;
  /** 微信头像 URL */
  avatarUrl?: string;
  /** 账户创建时间（ISO 8601） */
  createdAt: string;
  /** 是否为游客（离线模式） */
  isGuest: boolean;
  /** 用户等级（同步自成就系统） */
  level?: number;
  /** 总经验值 */
  experience?: number;
  /** 上次同步时间 */
  lastSyncAt?: string;
  /** 云端账号 ID（登录后设置） */
  cloudUserId?: string;
  /** 微信 openid */
  wechatOpenid?: string;
  /** 微信昵称 */
  wechatNickname?: string;
  /** 微信头像 URL */
  wechatAvatar?: string;
  /** 登录方式 */
  loginType?: string;
  /** APP 个人资料 */
  appProfile?: AppProfile;
}

/** 用户档案（兼容旧版） */
export interface UserProfile {
  id: string;
  nickname: string;
  avatar: AvatarType;
  createdAt: string;
}

/** localStorage 存储结构 */
export interface UserStorage {
  version: number;
  profile: UserProfile;
}

/** 默认昵称（未设置时显示） */
export const DEFAULT_NICKNAME = '跑者';

/** 头像选项 */
export const AVATAR_OPTIONS: { key: AvatarType; emoji: string; label: string }[] = [
  { key: 'default', emoji: '🧑', label: '默认' },
  { key: 'runner', emoji: '🏃', label: '跑者' },
  { key: 'climber', emoji: '🧗', label: '攀登者' },
  { key: 'explorer', emoji: '🧭', label: '探险家' },
  { key: 'cyclist', emoji: '🚴', label: '骑手' },
  { key: 'wechat', emoji: '💬', label: '微信头像' },
];

/** 存储键名 */
export const USER_STORAGE_KEY = 'vr_china_user_v1';
export const USER_STORAGE_VERSION = 3; // V3: 微信认证字段
