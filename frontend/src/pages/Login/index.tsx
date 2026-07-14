import { useState, useRef } from 'react';
import { useUserStore, loginMockCode } from '../../store/userStore';
import { mockSmsAdapter } from '../../services/sms/mockSms';
import { BRAND } from '../../config/brand';

interface Props {
  onGoToRegister: () => void;
  onLoginSuccess: () => void;
}

function BrandMark({ size = 72 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" style={{ width: size, height: size }}>
      <defs>
        <linearGradient id="loginBgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0D2B45" />
          <stop offset="100%" stopColor="#1E3A5F" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="200" rx="44" ry="44" fill="url(#loginBgGrad)" />
      <ellipse cx="100" cy="160" rx="120" ry="40" fill="#F28C22" />
      <ellipse cx="80" cy="145" rx="80" ry="35" fill="#FAD7A0" />
      <ellipse cx="100" cy="135" rx="55" ry="30" fill="#FFF4E0" />
      <circle cx="100" cy="110" r="18" fill="#FFE6B4" opacity="0.85" />
      <text x="100" y="48" textAnchor="middle" fill="#FFFFFF" fontSize="40" fontWeight="900" fontFamily="Arial Black, sans-serif">E23</text>
      <text x="100" y="72" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="700">跑起来</text>
      <g fill="#0D2B45">
        <circle cx="115" cy="148" r="3.5" />
        <path d="M115 151 L118 162 L116 170 M118 162 L112 168 M118 162 L123 167" stroke="#0D2B45" strokeWidth="1.5" fill="none" />
        <circle cx="92" cy="150" r="3" />
        <path d="M92 153 L94 162 L92 170 M94 162 L89 168 M94 162 L98 167" stroke="#0D2B45" strokeWidth="1.3" fill="none" />
        <circle cx="72" cy="152" r="2.5" />
        <path d="M72 154 L74 162 L72 169 M74 162 L70 168 M74 162 L77 167" stroke="#0D2B45" strokeWidth="1.1" fill="none" />
      </g>
    </svg>
  );
}

export default function Login({ onGoToRegister, onLoginSuccess }: Props) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeMsg, setCodeMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showWechatDialog, setShowWechatDialog] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { phoneLogin, wechatLogin } = useUserStore();

  const handleSendCode = async () => {
    if (!phone) { setError(BRAND.AUTH.errorPhone); return; }
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

  const handleLogin = async () => {
    if (!phone) { setError(BRAND.AUTH.errorPhone); return; }
    if (!code) { setError(BRAND.AUTH.errorCode); return; }
    setLoading(true);
    setError('');

    const result = await phoneLogin(phone, code);
    setLoading(false);

    if (result.success) {
      onLoginSuccess();
    } else {
      setError(BRAND.AUTH.errorCode);
    }
  };

  const handleWechatMock = () => {
    setShowWechatDialog(true);
  };

  const confirmWechatMock = async () => {
    setShowWechatDialog(false);
    setLoading(true);
    const result = await wechatLogin();
    setLoading(false);
    if (result.success) onLoginSuccess();
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-mark">
          <BrandMark size={72} />
        </div>
        <h1 className="login-title">{BRAND.APP_NAME}</h1>
        <p className="login-subtitle">{BRAND.TAGLINE}</p>
      </div>

      <div className="login-form">
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
              placeholder={BRAND.AUTH.codePlaceholder}
              maxLength={6}
            />
            <button
              className={`login-code-btn ${countdown > 0 ? 'disabled' : 'active'}`}
              onClick={handleSendCode}
              disabled={countdown > 0}
            >
              {countdown > 0 ? `${BRAND.AUTH.resendCode}（${countdown}s）` : BRAND.AUTH.getCodeBtn}
            </button>
          </div>
          {codeMsg && <div className="login-hint success">{codeMsg}</div>}
        </div>

        {error && <div className="login-error">{error}</div>}

        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? BRAND.AUTH.loginProcessing : BRAND.AUTH.loginBtn}
        </button>

        <div className="login-register-row">
          <span className="login-register-text">还没有账号？</span>
          <button className="login-register-link" onClick={onGoToRegister}>立即注册</button>
        </div>

        <div className="login-divider"><span>或</span></div>

        <button className="login-wechat-btn" onClick={handleWechatMock} disabled={loading}>
          🟢 {BRAND.AUTH.wechatBtn}
        </button>

        <div className="login-footer">
          <span className="login-footer-link">《用户协议》</span>
          <span className="login-footer-dot">·</span>
          <span className="login-footer-link">《隐私政策》</span>
        </div>
        <div className="login-footer-test">
          {BRAND.AUTH.footerVersion} · {BRAND.AUTH.footerTest}
        </div>
      </div>

      {showWechatDialog && (
        <div className="login-dialog-overlay" onClick={() => setShowWechatDialog(false)}>
          <div className="login-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="login-dialog-icon">⚠️</div>
            <div className="login-dialog-title">{BRAND.AUTH.wechatDialogTitle}</div>
            <div className="login-dialog-body">{BRAND.AUTH.wechatDialogBody}</div>
            <div className="login-dialog-actions">
              <button className="login-dialog-btn cancel" onClick={() => setShowWechatDialog(false)}>
                {BRAND.AUTH.wechatCancel}
              </button>
              <button className="login-dialog-btn confirm" onClick={confirmWechatMock}>
                {BRAND.AUTH.wechatConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
