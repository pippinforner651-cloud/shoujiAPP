import { useState } from 'react';
import E23Icon from '../../components/E23Icon';
import { BRAND } from '../../config/brand';
import { useUserStore } from '../../store/userStore';
import { validatePhone } from '../../utils/authCore';
import { AuthAgreement, TestModeNotice, useTestCode } from '../AuthShared';

interface Props { onGoToRegister: () => void; onLoginSuccess: () => void; }

export default function Login({ onGoToRegister, onLoginSuccess }: Props) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWechatDialog, setShowWechatDialog] = useState(false);
  const phoneLogin = useUserStore((state) => state.phoneLogin);
  const testCode = useTestCode(phone, setCode);

  const handleRequestCode = () => {
    const result = testCode.requestCode();
    setError(result.error);
  };

  const handleLogin = async () => {
    if (!validatePhone(phone)) return setError('请输入正确的11位手机号码。');
    if (!code) return setError('请输入测试验证码。');
    if (!agreed) return setError('请先阅读并同意用户协议和隐私政策。');
    setLoading(true);
    setError('');
    const result = await phoneLogin(phone, code);
    setLoading(false);
    if (result.success) onLoginSuccess();
    else setError(result.error || '登录失败，请检查输入。');
  };

  return (
    <main className="login-page">
      <section className="login-shell">
        <header className="login-brand">
          <div className="login-brand-mark"><E23Icon name="route" size={38} /></div>
          <p className="login-eyebrow">48城 · 21,423公里 · 从深圳出发</p>
          <h1 className="login-title">{BRAND.APP_NAME}</h1>
          <p className="login-subtitle">每一步，都在环游中国</p>
        </header>

        <TestModeNotice />

        <section className="login-form" aria-label="手机号测试登录">
          <div className="login-field">
            <label className="login-label" htmlFor="login-phone">手机号码</label>
            <input id="login-phone" className="login-input" type="tel" inputMode="numeric"
              value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
              placeholder="请输入11位手机号码" maxLength={11} autoComplete="tel" />
          </div>
          <div className="login-field">
            <label className="login-label" htmlFor="login-code">测试验证码</label>
            <div className="login-code-row">
              <input id="login-code" className="login-input code-input" type="text" inputMode="numeric"
                value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                placeholder="请输入123456" maxLength={6} autoComplete="one-time-code" />
              <button className="login-code-btn" onClick={handleRequestCode} disabled={testCode.countdown > 0}>
                {testCode.countdown > 0 ? `${testCode.countdown}s后重试` : '生成验证码'}
              </button>
            </div>
            {testCode.message && (
              <div className="login-hint success">
                <span>{testCode.message}</span>
                <button type="button" onClick={testCode.fillCode}>一键填入</button>
              </div>
            )}
          </div>

          <AuthAgreement checked={agreed} onChange={setAgreed} />
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-btn" onClick={handleLogin} disabled={loading}>
            {loading ? '正在进入旅程…' : '进入我的中国旅程'}
          </button>
          <div className="login-register-row">
            <span>第一次使用？</span><button onClick={onGoToRegister}>创建本地测试账号</button>
          </div>
          <div className="login-divider"><span>其他方式</span></div>
          <button className="login-wechat-btn" onClick={() => setShowWechatDialog(true)}>
            <E23Icon name="message" size={19} /> 微信登录（暂未接入）
          </button>
          <p className="login-footer-test">{BRAND.AUTH.footerVersion} · 数据主要保存在当前设备</p>
        </section>
      </section>

      {showWechatDialog && (
        <div className="login-dialog-overlay" onClick={() => setShowWechatDialog(false)}>
          <div className="login-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="login-dialog-icon"><E23Icon name="info" size={28} /></div>
            <div className="login-dialog-title">微信登录暂未接入</div>
            <div className="login-dialog-body">当前未配置微信开放平台，本测试版不会模拟授权成功，也不会生成假头像或微信资料。</div>
            <button className="login-dialog-btn confirm" onClick={() => setShowWechatDialog(false)}>知道了</button>
          </div>
        </div>
      )}
    </main>
  );
}
