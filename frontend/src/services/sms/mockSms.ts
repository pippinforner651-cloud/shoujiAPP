/**
 * Mock 短信服务
 *
 * 开发测试用，固定验证码 123456。
 * 不发送真实短信。
 */

import type { SmsAdapter } from './index';

export const mockSmsAdapter: SmsAdapter = {
  name: 'mock',

  async sendCode(phone: string) {
    console.log(`[Mock SMS] Code for ${phone}: 123456`);
    return { success: true, requestId: `mock_${Date.now()}` };
  },

  verifyCode(_phone: string, code: string) {
    return code === '123456';
  },
};
