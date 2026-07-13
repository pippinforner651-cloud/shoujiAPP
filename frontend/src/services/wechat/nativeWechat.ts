/**
 * 原生微信 SDK 适配器（预留）
 *
 * 通过 Capacitor 插件或 Cordova 插件接入原生微信 SDK。
 * 需要：
 * - @capacitor-community/wechat 或 cordova-plugin-wechat
 * - 微信开放平台 APPID
 */

import type { WechatAdapter, WechatAuthResult } from './index';

export const nativeWechatAdapter: WechatAdapter = {
  name: 'native',

  async login(): Promise<WechatAuthResult> {
    try {
      // TODO: 接入原生微信 SDK
      // const wx = (window as any).Wechat;
      // const result = await wx.auth({
      //   scope: 'snsapi_userinfo',
      //   state: 'wechat_sdk_demo',
      // });
      console.log('[Native Wechat] Would call native SDK login');
      return { success: false, error: 'Native WeChat SDK not configured' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },

  async getUserInfo(_openid: string): Promise<WechatAuthResult> {
    console.log('[Native Wechat] Would call native SDK getUserInfo');
    return { success: false, error: 'Native WeChat SDK not configured' };
  },
};
