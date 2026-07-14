import { useState, useRef } from 'react';
import { useUserStore } from '../../store/userStore';
import { mockSmsAdapter } from '../../services/sms/mockSms';
import { BRAND } from '../../config/brand';

const APP_NAME = BRAND.APP_NAME;
const APP_SUBTITLE = BRAND.TAGLINE;

interface Props {
  onBackToLogin: () => void;
  onRegisterSuccess: () => void;
}

export default function Register({ onBackToLogin, onRegisterSuccess }: Props) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [realName, setRealName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
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

    await mockSmsAdapter.sendCode(phone);
    setCodeMsg(BRAND.AUTH.testCodeMsg);

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
  };

  const handleRegister = async () => {
    if (!realName.trim()) { setError(BRAND.AUTH.errorName); return; }
    if (!phone) { setError(BRAND.AUTH.errorPhone); return; }
    if (phone.length !== 11) { setError(BRAND.AUTH.errorPhone); return; }
    if (!code) { setError(BRAND.AUTH.errorCode); return; }
    if (!agreeTerms) { setError(BRAND.AUTH.errorAgreement); return; }

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
      <div className="login-brand">
        <h1 className="login-title">{APP_NAME}</h1>
        <p className="login-subtitle">{APP_SUBTITLE}</p>
      </div>

      <div className="login-form">
          <div className="login-field">
          <label className="login-label">{BRAND.AUTH.realNameLabel}</label>
          <input
            className="login-input"
            type="text"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder={BRAND.AUTH.realNamePlaceholder}
          />
        </div>

        <div className="login-field">
          <label className="login-label">{BRAND.AUTH.phoneLabel}</label>
          <input
            className="login-input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={BRAND.AUTH.phonePlaceholder}
            maxLength={11}
          />
        </div>

        <div className="login-field">
          <label className="login-label">{BRAND.AUTH.codeLabel}</label>
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

        <div className="login-agree-row">
          <input
            type="checkbox"
            id="agree-terms"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="login-agree-checkbox"
          />
          <label htmlFor="agree-terms" className="login-agree-label">
            {BRAND.AUTH.agreementText}
            <span className="login-agree-link">用户协议</span>
            和
            <span className="login-agree-link">隐私政策</span>
          </label>
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
