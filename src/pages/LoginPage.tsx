import { useState } from 'react';
import { store } from '../lib/store';

const DEMO_NAMES = ['戈壁E23', '跑起来的E23', 'E23小飞侠', '边境线跑者', 'E23追梦人'];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const wxLogin = () => {
    setLoading(true);
    // 演示模式：模拟微信授权返回头像/昵称
    // 真实实现：跳转微信OAuth → 后端 code2session → 返回 openid+头像+昵称
    setTimeout(() => {
      store.login(DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)]);
    }, 800);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-emerald-900 via-emerald-800 to-slate-900 text-white">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* 品牌图标：橙底 E23 + 奔跑 */}
        <div className="w-28 h-28 rounded-[28px] bg-gradient-to-br from-orange-500 to-amber-500 shadow-2xl shadow-orange-500/30 flex flex-col items-center justify-center mb-6">
          <span className="text-3xl font-black tracking-tight leading-none">E23</span>
          <span className="text-[11px] font-bold mt-1 tracking-[0.2em]">跑起来</span>
        </div>
        <div className="text-2xl font-black mb-2">E23跑起来</div>
        <div className="text-sm text-white/70 text-center leading-relaxed">
          环中国边境线 27,191 公里接力<br />迈开双腿 · 健康到永远
        </div>
        <div className="mt-8 flex items-center gap-2 text-xs text-white/50">
          <span className="w-8 h-px bg-white/20"></span>
          戈壁挑战赛队长倡议 · E23班全体同行
          <span className="w-8 h-px bg-white/20"></span>
        </div>
      </div>
      <div className="px-8 pb-12">
        <button
          onClick={wxLogin}
          disabled={loading}
          className="w-full py-4 rounded-full bg-[#07C160] text-white font-bold text-lg flex items-center justify-center gap-2 active:bg-[#06ad56] disabled:opacity-70 shadow-lg shadow-emerald-500/20"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M8.7 4C4.9 4 2 6.6 2 9.9c0 1.9 1 3.5 2.6 4.6l-.7 2.1 2.4-1.2c.4.1.8.2 1.2.2h.4c-.2-.6-.3-1.2-.3-1.8 0-3.3 3-5.9 6.7-5.9h.4C14.1 5.5 11.7 4 8.7 4zm-2 3.2c.5 0 .8.4.8.8s-.4.8-.8.8-.8-.4-.8-.8.4-.8.8-.8zm4.5 0c.5 0 .8.4.8.8s-.4.8-.8.8-.8-.4-.8-.8.3-.8.8-.8zM22 13.8c0-2.7-2.5-4.9-5.6-4.9s-5.6 2.2-5.6 4.9 2.5 4.9 5.6 4.9c.6 0 1.2-.1 1.8-.3l2 1-.6-1.7c1.1-.8 1.8-2.1 1.8-3.9zm-7.5-1.5c-.4 0-.8-.3-.8-.7s.3-.7.8-.7.8.3.8.7-.4.7-.8.7zm3.7 0c-.4 0-.8-.3-.8-.7s.3-.7.8-.7.8.3.8.7-.4.7-.8.7z"/></svg>
          {loading ? '微信授权中…' : '微信一键登录'}
        </button>
        <div className="text-center text-xs text-white/40 mt-4">登录后使用微信头像与微信名（可在APP内修改专用昵称）<br />演示版本：真实微信登录需开放平台资质与后端服务</div>
      </div>
    </div>
  );
}
