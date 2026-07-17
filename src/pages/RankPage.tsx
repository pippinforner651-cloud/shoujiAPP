import { useSyncExternalStore } from 'react';
import { store, fmtPace } from '../lib/store';

function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>
      {name.slice(0, 1)}
    </div>
  );
}

export default function RankPage() {
  useSyncExternalStore((f) => store.subscribe(f), () => store);
  const me = store.user;
  const rows = [
    ...store.teammates.map((t) => ({ name: t.name, color: t.color, km: t.totalKm, today: t.todayKm, streak: t.streak, me: false })),
    ...(me ? [{ name: me.nickname, color: me.color, km: Math.round(store.myTotalKm * 10) / 10, today: Math.round(store.myTodayKm * 10) / 10, streak: store.myRunDays, me: true }] : []),
  ].sort((a, b) => b.km - a.km);

  const myRank = rows.findIndex((r) => r.me) + 1;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-slate-100">
        <div className="text-lg font-black text-slate-800">E23班排行榜</div>
        <div className="text-xs text-slate-500 mt-0.5">年度目标人均 270 km · 全班接力 27,191 km</div>
        {me && (
          <div className="mt-2 text-xs text-slate-600">
            我的排名：<b className="text-orange-600">第 {myRank} 名</b> · 累计 {store.myTotalKm.toFixed(1)} km · 平均配速 {fmtPace(store.myAvgPaceSec)}
          </div>
        )}
      </div>
      <div className="p-4 space-y-2.5">
        {rows.map((r, i) => (
          <div key={r.name + i} className={`flex items-center gap-3 p-3 rounded-2xl ${r.me ? 'bg-orange-50 ring-1 ring-orange-200' : 'bg-white'} shadow-sm`}>
            <div className="w-7 text-center font-black text-slate-400">
              {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
            </div>
            <Avatar name={r.name} color={r.color} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-800 truncate">{r.name}{r.me && <span className="ml-1.5 text-xs text-orange-500">（我）</span>}</div>
              <div className="text-xs text-slate-500">连续打卡 {r.streak} 天{r.today > 0 ? ` · 今日 +${r.today} km` : ''}</div>
            </div>
            <div className="text-right">
              <div className="font-black text-slate-800 tabular-nums">{r.km.toFixed(1)}</div>
              <div className="text-[10px] text-slate-400">km</div>
            </div>
          </div>
        ))}
        <div className="text-center text-xs text-slate-400 pt-2 pb-4">真实多人排名需后端同步服务，当前为班级演示数据</div>
      </div>
    </div>
  );
}
