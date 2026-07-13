/**
 * SMS 服务适配器
 *
 * 短信发送的统一接口层。
 * 当前使用 Mock 实现，接入真实短信服务后替换实现即可。
 */

export interface SmsAdapter {
  /** 适配器名称 */
  name: string;
  /** 发送验证码 */
  sendCode: (phone: string) => Promise<{ success: boolean; requestId?: string; error?: string }>;
  /** 验证码校验（仅 Mock 需要，真实服务由后端校验） */
  verifyCode?: (phone: string, code: string) => boolean;
}

export { mockSmsAdapter } from './mockSms';
export { aliyunSmsAdapter } from './aliyunSms';
