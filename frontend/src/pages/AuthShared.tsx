import { useEffect, useRef, useState } from 'react';
import { TEST_AUTH_CONFIG, validatePhone } from '../utils/authCore';

export function useTestCode(phone: string, onFill: (code: string) => void) {
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const requestCode = () => {
    if (!validatePhone(phone)) return { success: false, error: '请输入正确的11位手机号码。' };
    if (countdown > 0) return { success: false, error: '' };
    setMessage(TEST_AUTH_CONFIG.generatedMessage);
    setCountdown(TEST_AUTH_CONFIG.countdownSeconds);
    timerRef.current = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return { success: true, error: '' };
  };

  return {
    countdown,
    message,
    requestCode,
    fillCode: () => onFill(TEST_AUTH_CONFIG.code),
  };
}

export function TestModeNotice() {
  return (
    <div className="auth-test-notice" role="note">
      <div className="auth-test-badge">TEST · 本地体验版</div>
      <strong>验证码固定为 123456</strong>
      <span>不会发送真实短信；{TEST_AUTH_CONFIG.storageMessage}。</span>
    </div>
  );
}

interface AgreementProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function AuthAgreement({ checked, onChange }: AgreementProps) {
  return (
    <label className="login-agree-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="login-agree-checkbox"
      />
      <span className="login-agree-label">
        我已阅读并同意 <span className="login-agree-link">用户协议</span> 和
        <span className="login-agree-link"> 隐私政策</span>
      </span>
    </label>
  );
}
