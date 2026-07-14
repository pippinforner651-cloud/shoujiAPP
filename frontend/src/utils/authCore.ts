export const TEST_AUTH_CONFIG = {
  code: '123456',
  countdownSeconds: 60,
  generatedMessage: '测试验证码已生成，可一键填入 123456',
  wechatMode: 'unavailable',
  storageMessage: '跑步数据主要保存在当前设备',
} as const;

export function validatePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone.trim());
}

export function verifyTestCode(code: string): boolean {
  return code.trim() === TEST_AUTH_CONFIG.code;
}

export function shouldShowFirstRunGuide(hasCompletedGuide: boolean, recordCount: number): boolean {
  return !hasCompletedGuide && recordCount === 0;
}
