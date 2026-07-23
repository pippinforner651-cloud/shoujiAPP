import { useSyncExternalStore } from 'react';
import { store, fmtPace } from '../lib/store';
import { CONFIG } from '../config';

export default function RankPage() {
  useSyncExternalStore((f) => store.subscribe(f), () => store.version);
  const me = store.user;

  return (
    <div className="h-full overflow-y-auto bg-slate-50" style={{ paddingBottom: 'var(--page-bottom-reserve)' }}>
      <div className="px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-slate-100">
        <div className="text-lg font-black text-slate-800">E23班排行榜</div>
        <div className="text-xs text-slate-500 mt-0.5">年度目标人均 {CONFIG.ANNUAL_GOAL_KM} km · 全班接力 27,171 km</div>
      </div>

      {/* 多人未上线：不生成测试用户冒充同学 */}
      {!CONFIG.MULTIPLAYER_ENABLED && (
        <div className="m-4 bg-white rounded-2xl shadow-sm p-6 text-center">
          <div className="text-4xl mb-3">🚧</div>
          <div className="font-bold text-slate-800 mb-1">多人排行榜尚未启用</div>
          <div className="text-sm text-slate-500 leading-relaxed">
            真实班级排名需要多人后端上线后同步<br />当前不展示任何模拟同学数据
          </div>
          <div className="mt-3 text-xs text-slate-400">上线流程：微信登录 → E23邀请码 → 管理员审批 → 真实排行</div>
        </div>
      )}

      {/* 本人真实数据卡片 */}
      {me && (
        <div className="mx-4 mb-4">
          <div className="text-sm font-bold text-slate-700 mb-2 px-1">我的数据（本机真实）</div>
          <div className="bg-orange-50 ring-1 ring-orange-200 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              {me.avatarUrl ? (
                <img src={me.avatarUrl} className="w-11 h-11 rounded-full object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: me.color }}>
                  {me.nickname.slice(0, 1)}
                </div>
              )}
              <div>
                <div className="font-bold text-slate-800">{me.nickname} <span className="text-xs text-orange-500">（我）</span></div>
                <div className="text-xs text-slate-500">打卡 {store.myRunCount} 次 · 平均配速 {fmtPace(store.myAvgPaceSec)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white rounded-xl py-2.5">
                <div className="font-black text-slate-800 tabular-nums">{store.myTotalKm.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500">年度累计 km</div>
              </div>
              <div className="bg-white rounded-xl py-2.5">
                <div className="font-black text-slate-800 tabular-nums">{store.myMonthKm.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500">本月里程 km</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
