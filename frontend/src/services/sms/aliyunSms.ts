/**
 * 阿里云短信服务（预留）
 *
 * 接入阿里云 SMS API 时启用。
 * 需要配置：AccessKeyId, AccessKeySecret, SignName, TemplateCode
 */

import type { SmsAdapter } from './index';

export const aliyunSmsAdapter: SmsAdapter = {
  name: 'aliyun',

  async sendCode(phone: string) {
    // TODO: 接入阿里云短信 SDK
    // const res = await Dysmsapi20170525.sendSms({
    //   PhoneNumbers: phone,
    //   SignName: '全民环游中国',
    //   TemplateCode: 'SMS_xxx',
    //   TemplateParam: JSON.stringify({ code }),
    // });
    console.log(`[Aliyun SMS] Would send code to ${phone}`);
    return { success: false, error: 'Not implemented yet' };
  },
};
