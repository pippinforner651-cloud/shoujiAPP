import assert from 'node:assert/strict';
import test from 'node:test';

const authCore = await import('../src/utils/authCore.ts').catch(() => ({}));

test('accepts only valid mainland mobile numbers', () => {
  assert.equal(typeof authCore.validatePhone, 'function');
  assert.equal(authCore.validatePhone!('13800138000'), true);
  assert.equal(authCore.validatePhone!('12800138000'), false);
  assert.equal(authCore.validatePhone!('1380013800'), false);
});

test('uses the frozen test code without implying a real SMS', () => {
  assert.equal(authCore.TEST_AUTH_CONFIG?.code, '123456');
  assert.equal(authCore.verifyTestCode?.('123456'), true);
  assert.equal(authCore.verifyTestCode?.('000000'), false);
  assert.match(authCore.TEST_AUTH_CONFIG?.generatedMessage ?? '', /测试验证码已生成/);
  assert.doesNotMatch(authCore.TEST_AUTH_CONFIG?.generatedMessage ?? '', /短信已发送/);
});

test('keeps WeChat explicitly unavailable', () => {
  assert.equal(authCore.TEST_AUTH_CONFIG?.wechatMode, 'unavailable');
});

test('shows onboarding only for a newly authenticated device', () => {
  assert.equal(typeof authCore.shouldShowFirstRunGuide, 'function');
  assert.equal(authCore.shouldShowFirstRunGuide!(false, 0), true);
  assert.equal(authCore.shouldShowFirstRunGuide!(true, 0), false);
  assert.equal(authCore.shouldShowFirstRunGuide!(false, 2), false);
});
