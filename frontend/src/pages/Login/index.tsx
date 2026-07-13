import { useState, useRef } from 'react';
import { useUserStore } from '../../store/userStore';
import { mockSmsAdapter } from '../../services/sms/mockSms';

interface Props {
  onGoToRegister: () => void;
  onLoginSuccess: () => void;
}

export default function Login({ onGoToRegister, onLoginSuccess }: Props) {
  const [phone, setPhone] = useState('13800138000');
  const [code, setCode] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeMsg, setCodeMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { phoneLogin, wechatLogin } = useUserStore();

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone) { setError('请输入手机号'); return; }
    if (countdown > 0) return;
    setError('');
    setCodeMsg('');

    console.log('[Login] 发送验证码到:', phone);
    const result = await mockSmsAdapter.sendCode(phone);
    console.log('[Login] 发送结果:', result);

    if (result.success) {
      setCodeMsg('验证码发送成功！测试验证码：123456');

      // 60秒倒计时
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setError('验证码发送失败');
    }
  };

  const handleLogin = async () => {
    if (!phone) { setError('请输入手机号'); return; }
    if (!code) { setError('请输入验证码'); return; }
    setLoading(true);
    setError('');

    const result = await phoneLogin(phone, code);
    setLoading(false);

    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error || '登录失败');
    }
  };

  const handleWechat = async () => {
    setLoading(true);
    const result = await wechatLogin();
    setLoading(false);
    if (result.success) onLoginSuccess();
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <div className="login-logo">🌏</div>
        <h1 className="login-title">全民环游中国</h1>
      </div>

      <div className="login-form">
        {/* 手机号 */}
        <div className="login-field">
          <label className="login-label">手机号</label>
          <input
            className="login-input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="请输入手机号"
            maxLength={11}
          />
        </div>

        {/* 验证码 */}
        <div className="login-field">
          <label className="login-label">验证码</label>
          <div className="login-code-row">
            <input
              className="login-input code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入验证码"
              maxLength={6}
            />
            <button
              className={`login-code-btn ${countdown > 0 ? 'disabled' : 'active'}`}
              onClick={handleSendCode}
              disabled={countdown > 0}
            >
              {countdown > 0 ? `${countdown}s` : '获取验证码'}
            </button>
          </div>
          {codeMsg && <div className="login-hint success">{codeMsg}</div>}
        </div>

        {error && <div className="login-error">{error}</div>}

        {/* 登录按钮 */}
        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>

        {/* 注册入口 */}
        <div className="login-register-row">
          <span className="login-register-text">还没有账号？</span>
          <button className="login-register-link" onClick={onGoToRegister}>立即注册</button>
        </div>

        {/* 分隔 */}
        <div className="login-divider">
          <span>或</span>
        </div>

        {/* 微信登录 */}
        <button className="login-wechat-btn" onClick={handleWechat} disabled={loading}>
          🟢 微信授权登录
        </button>
      </div>
    </div>
  );
}
