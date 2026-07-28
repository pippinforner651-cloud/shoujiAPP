import { useState } from 'react';
import { store } from '../lib/store';
import { CONFIG } from '../config';
import { signIn, signUp } from '../services/auth';
import { isSupabaseEnabled } from '../lib/supabase';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [nick, setNick] = useState('');
  const [err, setErr] = useState('');
  const [sbPhone, setSbPhone] = useState('');
  const [sbPw, setSbPw] = useState('');
  const [sbNick, setSbNick] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [sbLoading, setSbLoading] = useState(false);

  const testLogin = () => {
    if (!/^1\d{10}$/.test(phone)) { setErr('请输入11位测试手机号'); return; }
    if (code !== CONFIG.TEST_SMS_CODE) { setErr(`测试验证码为 ${CONFIG.TEST_SMS_CODE}`); return; }
    store.login(nick.trim() || `E23同学${phone.slice(-4)}`, phone);
  };

  const handleCloudAuth = async () => {
    setErr('');
    if (!sbPhone || !sbPw) { setErr('请输入手机号和密码'); return; }
    if (isRegister && !/^1\d{10}$/.test(sbPhone)) { setErr('请输入11位手机号'); setSbLoading(false); return; }
    setSbLoading(true);
    try {
      if (isRegister) {
        if (!sbNick.trim()) { setErr('请输入昵称'); setSbLoading(false); return; }
        const r = await signUp(sbPhone, sbPw, sbNick.trim());
        if (!r.ok) { setErr(r.error); setSbLoading(false); return; }
        store.loginBackend({ id: r.userId, nickname: sbNick.trim(), avatarUrl: null, phone: sbPhone, role: 'member', status: 'pending' });
      } else {
        const r = await signIn(sbPhone, sbPw);
        if (!r.ok) { setErr(r.error); setSbLoading(false); return; }
        const p = r.profile as { id: string; nickname: string; avatar_url?: string; role?: string; status?: string; class_id?: string };
        store.loginBackend({ id: p.id, nickname: p.nickname, avatarUrl: p.avatar_url ?? null, phone: sbPhone, role: (p.role as 'member' | 'admin') || 'member', status: (p.status as 'pending' | 'approved' | 'rejected') || 'approved', classId: p.class_id });
      }
    } catch (e) { setErr(e instanceof Error ? e.message : '认证失败'); }
    setSbLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-emerald-900 via-emerald-800 to-slate-900 text-white">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-28 h-28 rounded-[28px] bg-gradient-to-br from-orange-500 to-amber-500 shadow-2xl shadow-orange-500/30 flex flex-col items-center justify-center mb-6">
          <span className="text-3xl font-black tracking-tight leading-none">E23</span>
          <span className="text-[11px] font-bold mt-1 tracking-[0.2em]">跑起来</span>
        </div>
        <div className="text-2xl font-black mb-1">E23跑起来</div>
        <div className="text-sm text-white/80 mb-2 font-medium">从戈壁出发，奔向世界</div>
        <div className="mb-3 text-[11px] px-3 py-1 rounded-full bg-white/15 text-white/80 font-bold tracking-wider">{CONFIG.APP_EDITION}</div>
        <div className="text-sm text-white/70 text-center leading-relaxed">
          E23同学共同完成约27000公里中国路线挑战
        </div>
      </div>
      <div className="px-8 pb-6 space-y-3">
        {isSupabaseEnabled() && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-bold">云端登录</span>
              <span className="text-xs text-white/50">Supabase 多人模式 · 数据永久保存</span>
            </div>
            <input value={sbPhone} onChange={(e) => setSbPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="手机号" inputMode="numeric"
              className="w-full mb-2 px-4 py-3 rounded-xl bg-white/90 text-slate-800 text-sm outline-none placeholder:text-slate-400" />
            <input value={sbPw} onChange={(e) => setSbPw(e.target.value)} placeholder="密码" type="password"
              className="w-full mb-2 px-4 py-3 rounded-xl bg-white/90 text-slate-800 text-sm outline-none" />
            {isRegister && (
              <input value={sbNick} onChange={(e) => setSbNick(e.target.value.slice(0, 12))} placeholder="App昵称"
                className="w-full mb-3 px-4 py-3 rounded-xl bg-white/90 text-slate-800 text-sm outline-none" />
            )}
            {err && <div className="text-xs text-amber-300 mb-2">{err}</div>}
            <button onClick={handleCloudAuth} disabled={sbLoading}
              className="w-full py-3.5 rounded-full bg-emerald-500 text-white font-bold active:bg-emerald-600 disabled:bg-slate-600">
              {sbLoading ? '处理中...' : isRegister ? '注册并加入' : '登录'}
            </button>
            <button onClick={() => { setIsRegister(!isRegister); setErr(''); }} className="mt-2 text-xs text-white/50 underline">
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </button>
          </div>
        )}
        {/* 测试登录入口（明确标注，非真实短信/微信授权） */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">测试登录</span>
            <span className="text-xs text-white/50">非真实短信 · 非微信授权</span>
          </div>
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="测试手机号" inputMode="numeric"
            className="w-full mb-2 px-4 py-3 rounded-xl bg-white/90 text-slate-800 text-sm outline-none placeholder:text-slate-400" />
          <div className="flex gap-2 mb-2">
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={`测试验证码 ${CONFIG.TEST_SMS_CODE}`} inputMode="numeric"
              className="flex-1 px-4 py-3 rounded-xl bg-white/90 text-slate-800 text-sm outline-none placeholder:text-slate-400" />
            <button onClick={() => setCode(CONFIG.TEST_SMS_CODE)}
              className="px-4 rounded-xl bg-white/20 text-xs text-white/80">填入</button>
          </div>
          <input value={nick} onChange={(e) => setNick(e.target.value.slice(0, 12))}
            placeholder="App昵称（选填，可登录后修改）"
            className="w-full mb-3 px-4 py-3 rounded-xl bg-white/90 text-slate-800 text-sm outline-none placeholder:text-slate-400" />
          {err && <div className="text-xs text-amber-300 mb-2">{err}</div>}
          <button onClick={testLogin}
            className="w-full py-3.5 rounded-full bg-[#07C160] text-white font-bold active:bg-[#06ad56]">
            进入活动
          </button>
        </div>
        <div className="text-center text-xs text-white/40 mt-4 leading-relaxed">
          正式流程预留：微信授权 → E23邀请码 → 管理员审批 → 进入活动<br />当前阶段仅开放本机测试，数据保存在本机
        </div>
      </div>
    </div>
  );
}
