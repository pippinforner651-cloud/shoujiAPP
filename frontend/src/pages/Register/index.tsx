import { useState } from 'react';
import E23Icon from '../../components/E23Icon';
import { useUserStore } from '../../store/userStore';
import { validatePhone } from '../../utils/authCore';
import { AuthAgreement, TestModeNotice, useTestCode } from '../AuthShared';

interface Props { onBackToLogin: () => void; onRegisterSuccess: () => void; }

export default function Register({ onBackToLogin, onRegisterSuccess }: Props) {
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const phoneRegister = useUserStore((state) => state.phoneRegister);
  const testCode = useTestCode(phone, setCode);

  const handleRegister = async () => {
    if (!nickname.trim()) return setError('请填写一个用于本机显示的昵称。');
    if (!validatePhone(phone)) return setError('请输入正确的11位手机号码。');
    if (!code) return setError('请输入测试验证码。');
    if (!agreed) return setError('请先阅读并同意用户协议和隐私政策。');
    setLoading(true);
    setError('');
    const result = await phoneRegister(phone, code, nickname.trim());
    setLoading(false);
    if (result.success) onRegisterSuccess();
    else setError(result.error || '创建失败，请检查输入。');
  };

  return (
    <main className="login-page">
      <section className="login-shell">
        <header className="login-brand compact">
          <button className="auth-back" onClick={onBackToLogin} aria-label="返回登录"><E23Icon name="back" size={22} /></button>
          <p className="login-eyebrow">创建本地测试账号</p>
          <h1 className="login-title">从第一公里开始</h1>
          <p className="login-subtitle">账号和跑步记录主要保存在当前设备</p>
        </header>
        <TestModeNotice />
        <section className="login-form">
          <div className="login-field"><label className="login-label" htmlFor="register-name">昵称</label>
            <input id="register-name" className="login-input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="例如：晨跑小陈" maxLength={16} /></div>
          <div className="login-field"><label className="login-label" htmlFor="register-phone">手机号码</label>
            <input id="register-phone" className="login-input" type="tel" inputMode="numeric" value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="请输入11位手机号码" maxLength={11} /></div>
          <div className="login-field"><label className="login-label" htmlFor="register-code">测试验证码</label>
            <div className="login-code-row"><input id="register-code" className="login-input code-input" inputMode="numeric" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="请输入123456" maxLength={6} />
              <button className="login-code-btn" onClick={() => { const result = testCode.requestCode(); setError(result.error); }} disabled={testCode.countdown > 0}>
                {testCode.countdown > 0 ? `${testCode.countdown}s后重试` : '生成验证码'}</button></div>
            {testCode.message && <div className="login-hint success"><span>{testCode.message}</span><button onClick={testCode.fillCode}>一键填入</button></div>}
          </div>
          <AuthAgreement checked={agreed} onChange={setAgreed} />
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-btn" onClick={handleRegister} disabled={loading}>{loading ? '正在创建…' : '创建账号并开始旅程'}</button>
          <div className="login-register-row"><span>已有本地账号？</span><button onClick={onBackToLogin}>返回登录</button></div>
        </section>
      </section>
    </main>
  );
}
