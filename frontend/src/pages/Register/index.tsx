import { useState, useRef } from 'react';
import { useUserStore } from '../../store/userStore';
import { mockSmsAdapter } from '../../services/sms/mockSms';

interface Props {
  onBackToLogin: () => void;
  onRegisterSuccess: () => void;
}

export default function Register({ onBackToLogin, onRegisterSuccess }: Props) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [realName, setRealName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeMsg, setCodeMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { phoneRegister } = useUserStore();

  const handleSendCode = async () => {
    if (!phone) { setError('请输入手机号'); return; }
    if (countdown > 0) return;
    setError('');
    setCodeMsg('');

    console.log('[Register] 发送验证码到:', phone);
    const result = await mockSmsAdapter.sendCode(phone);
    console.log('[Register] 发送结果:', result);

    if (result.success) {
      setCodeMsg('验证码发送成功！测试验证码：123456');
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

  const handleRegister = async () => {
    if (!phone) { setError('请输入手机号'); return; }
    if (!code) { setError('请输入验证码'); return; }
    if (!realName) { setError('请输入真实姓名'); return; }
    setLoading(true);
    setError('');

    const result = await phoneRegister(phone, code, realName);
    setLoading(false);

    if (result.success) {
      onRegisterSuccess();
    } else {
      setError(result.error || '注册失败');
    }
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <div className="login-logo">🌏</div>
        <h1 className="login-title">注册账号</h1>
      </div>

      <div className="login-form">
        <div className="login-field">
          <label className="login-label">真实姓名</label>
          <input
            className="login-input"
            type="text"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder="请输入真实姓名"
          />
        </div>

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

        <button className="login-btn" onClick={handleRegister} disabled={loading}>
          {loading ? '注册中...' : '注册'}
        </button>

        <div className="login-register-row">
          <span className="login-register-text">已有账号？</span>
          <button className="login-register-link" onClick={onBackToLogin}>返回登录</button>
        </div>
      </div>
    </div>
  );
}
