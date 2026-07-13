/**
 * Mock 微信登录
 *
 * 开发测试用，模拟微信授权返回。
 * 不接入真实微信 SDK。
 */

import type { WechatAdapter, WechatAuthResult } from './index';

export const mockWechatAdapter: WechatAdapter = {
  name: 'mock',

  async login(): Promise<WechatAuthResult> {
    const mockOpenid = `wx_mock_${Date.now().toString(36)}`;
    return {
      success: true,
      code: 'mock_auth_code',
      openid: mockOpenid,
      unionid: `union_${mockOpenid}`,
      nickname: '微信用户',
      avatar: 'https://mock.avatar/default.png',
    };
  },

  async getUserInfo(_openid: string): Promise<WechatAuthResult> {
    return {
      success: true,
      nickname: '微信用户',
      avatar: 'https://mock.avatar/default.png',
    };
  },
};
