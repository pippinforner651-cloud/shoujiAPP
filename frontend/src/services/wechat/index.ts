/**
 * 微信 SDK 接口层
 *
 * 统一微信登录/分享/支付的接口定义。
 * 当前使用 Mock 实现，接入原生微信 SDK 后替换。
 */

export interface WechatAuthResult {
  success: boolean;
  code?: string;
  openid?: string;
  unionid?: string;
  nickname?: string;
  avatar?: string;
  error?: string;
}

export interface WechatAdapter {
  name: string;
  /** 微信登录授权 */
  login: () => Promise<WechatAuthResult>;
  /** 获取用户信息（需登录后调用） */
  getUserInfo: (openid: string) => Promise<WechatAuthResult>;
}

export { mockWechatAdapter } from './mockWechat';
export { nativeWechatAdapter } from './nativeWechat';
