import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const authSource = readFileSync(new URL('../routes/auth.ts', import.meta.url), 'utf8');
const phoneAuthSource = readFileSync(new URL('../routes/phoneAuth.ts', import.meta.url), 'utf8');

test('backend WeChat route cannot mint simulated identities or tokens', () => {
  assert.doesNotMatch(authSource, /mockWechatUser|mock_token|wx_openid_/);
  assert.match(authSource, /WECHAT_NOT_CONFIGURED/);
});

test('backend phone route cannot mint simulated production tokens', () => {
  assert.doesNotMatch(phoneAuthSource, /mock_token/);
  assert.match(phoneAuthSource, /PHONE_AUTH_NOT_CONFIGURED/);
});
