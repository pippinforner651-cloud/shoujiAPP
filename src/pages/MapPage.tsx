import { useMemo, useState, useSyncExternalStore } from 'react';
import ChinaMap from '../components/ChinaMap';
import { store, fmtDuration, fmtPace } from '../lib/store';
import { getActivePack } from '../lib/integrations';
import { positionAt, nextNamedNode, type RouteNode } from '../data/route';
import { CONFIG } from '../config';

export default function MapPage() {
  useSyncExternalStore((f) => store.subscribe(f), () => store.version);
  const [selected, setSelected] = useState<RouteNode | null>(null);
  const [posOpen, setPosOpen] = useState(false);
  const [view, setView] = useState<'team' | 'me'>('team');
  const pack = useMemo(() => getActivePack(store.customPack), [store.customPack]);

  // 两张地图：班级接力图（全班累计）+ 我的足迹图（个人累计）
  // 多人后端未上线：两者都仅含本机真实贡献，班级图照常显示并如实标注
  const total = view === 'team' ? store.classTotalKm : store.myTotalKm;
  const pos = useMemo(() => positionAt(pack.totalKm > 0 ? total % pack.totalKm : 0), [total, pack.totalKm]);
  const heading = useMemo(() => nextNamedNode(total), [total]);
  const pct = pack.totalKm > 0 ? Math.min(100, (total / pack.totalKm) * 100) : 0;
  const goalPct = Math.min(100, (total / CONFIG.ANNUAL_GOAL_KM) * 100);

  const showCurrent = () => { setSelected(null); setPosOpen(true); };
  const recent = store.records.slice(0, 8);

  return (
    <div className="flex flex-col h-full" style={{ paddingBottom: 'var(--page-bottom-reserve)' }}>
      {/* 顶部统计区 */}
      <div className="px-4 pt-3 pb-2 bg-gradient-to-b from-emerald-50 to-transparent">
        {/* 双地图切换：班级接力 / 我的足迹 */}
        <div className="grid grid-cols-2 p-1 rounded-full bg-slate-200/70 mb-2.5">
          <button onClick={() => setView('team')}
            className={`py-1.5 rounded-full text-sm font-bold transition ${view === 'team' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>
            班级接力图
          </button>
          <button onClick={() => setView('me')}
            className={`py-1.5 rounded-full text-sm font-bold transition ${view === 'me' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>
            我的足迹图
          </button>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-slate-500">{view === 'team' ? 'E23班环中国接力 · 全班累计' : '我的足迹 · 个人累计'}</div>
            <div className="text-3xl font-black text-slate-800 leading-tight">
              {total.toLocaleString('zh-CN', { maximumFractionDigits: 1 })}
              <span className="text-base font-semibold text-slate-500 ml-1">km</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">环线总长 <span className="text-[9px] px-1 py-0.5 rounded bg-slate-200 text-slate-500 font-bold">{CONFIG.APP_EDITION}</span></div>
            <div className="text-lg font-bold text-slate-700">{pack.totalKm.toLocaleString()} km</div>
          </div>
        </div>
        {/* 已完成 / 当前位置 / 剩余路线 */}
        <div className="mt-2 h-2.5 rounded-full bg-blue-200 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all" style={{ width: `${Math.max(0.4, pct)}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>已完成 <b className="text-orange-600">{pct.toFixed(2)}%</b>（1:1 真实跑量）</span>
          <span>剩余 <b className="text-blue-600">{Math.max(0, pack.totalKm - total).toLocaleString('zh-CN', { maximumFractionDigits: 0 })} km</b></span>
        </div>
        {/* 今日数据 + 年度目标 */}
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white rounded-xl py-1.5 shadow-sm">
            <div className="text-sm font-black text-slate-800 tabular-nums">{store.myTodayKm.toFixed(1)}</div>
            <div className="text-[10px] text-slate-500">今日里程 km</div>
          </div>
          <div className="bg-white rounded-xl py-1.5 shadow-sm">
            <div className="text-sm font-black text-slate-800 tabular-nums">{store.myTodayCount}</div>
            <div className="text-[10px] text-slate-500">今日打卡次数</div>
          </div>
          <div className="bg-white rounded-xl py-1.5 shadow-sm">
            <div className="text-sm font-black text-slate-800 tabular-nums">{goalPct.toFixed(0)}%</div>
            <div className="text-[10px] text-slate-500">年度目标 {CONFIG.ANNUAL_GOAL_KM}km</div>
          </div>
        </div>
        {/* 多人状态：不伪造人数/里程 */}
        {!CONFIG.MULTIPLAYER_ENABLED && (
          <div className="mt-2 text-[11px] px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-center">
            {view === 'team'
              ? '多人功能尚未上线 · 今日参与人数和全班总里程需后端接入 · 当前班级图仅显示本机贡献'
              : '多人功能尚未上线 · 当前足迹图为本机真实数据'}
          </div>
        )}
      </div>

      {/* 地图 */}
      <div className="flex-1 relative bg-[#F4F8F6] min-h-0">
        <ChinaMap pack={pack} progressKm={total} onSelectNode={(n) => { setPosOpen(false); setSelected(n); }} onRunnerClick={showCurrent} selectedNode={selected} />
        {/* 当前位置卡 */}
        <button
          onClick={showCurrent}
          className="absolute left-3 bottom-3 right-3 sm:right-auto sm:w-80 bg-white/95 backdrop-blur rounded-2xl shadow-lg px-4 py-3 text-left active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🏃</span>
            <span className="text-xs text-slate-500">当前位置（环线第 {Math.floor(total % pack.totalKm).toLocaleString()} km）</span>
          </div>
          <div className="mt-1 font-bold text-slate-800">
            {pos.next.road} · 前往 {heading.node.name}
            <span className="ml-2 text-xs font-normal text-slate-500">还有 {heading.distKm.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} km</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">点击小人查看：在哪条路上、去往哪里、当地风物 →</div>
        </button>
      </div>

      {/* 最近真实运动动态（仅本机真实记录） */}
      <div className="shrink-0 bg-white border-t border-slate-100">
        <div className="px-4 pt-2 pb-1 text-xs font-bold text-slate-600">最近运动动态 <span className="font-normal text-slate-400">（本机真实记录）</span></div>
        {recent.length === 0 ? (
          <div className="px-4 pb-3 text-xs text-slate-400">还没有运动记录，去「跑步」页完成第一跑</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto px-4 pb-2.5">
            {recent.map((r) => (
              <div key={r.id} className="shrink-0 w-32 bg-slate-50 rounded-xl px-3 py-2">
                <div className="font-black text-slate-800 tabular-nums text-sm">{r.km.toFixed(2)} km</div>
                <div className="text-[10px] text-slate-500">{fmtDuration(r.durationSec)} · {fmtPace(r.avgPaceSec)}/km</div>
                <div className="text-[10px] text-slate-400">{new Date(r.ts).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 当前位置抽屉 */}
      {posOpen && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-white rounded-t-3xl shadow-2xl max-h-[62%] overflow-y-auto">
          <div className="sticky top-0 bg-white rounded-t-3xl px-5 pt-3 pb-2 border-b border-slate-100">
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-3" />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-black text-slate-800">🏃 跑到这里了</div>
                <div className="text-xs text-slate-500 mt-0.5">环线第 {Math.floor(total % pack.totalKm).toLocaleString()} km · {pos.next.province || pos.node.province}</div>
              </div>
              <button onClick={() => setPosOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500">✕</button>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="bg-orange-50 rounded-2xl p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">🛣 当前所在道路</span>
                <span className="font-bold text-slate-800">{pos.next.road}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">🚩 正在前往</span>
                <span className="font-bold text-slate-800">{heading.node.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">📏 距下一城市</span>
                <span className="font-bold text-orange-600">{heading.distKm.toLocaleString('zh-CN', { maximumFractionDigits: 1 })} km</span>
              </div>
              <div className="h-1.5 rounded-full bg-white overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, 100 - (heading.distKm / Math.max(1, heading.node.segKm)) * 100)}%` }} />
              </div>
            </div>
            <div className="text-sm font-bold text-slate-700">到了「{heading.node.name}」可以看到这些：</div>
            <div>
              <div className="text-xs text-slate-500 mb-1.5">🏔 名胜古迹</div>
              <div className="flex flex-wrap gap-2">
                {heading.node.spots.map((s) => (
                  <span key={s} className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1.5">🍜 美食推荐</div>
              <div className="flex flex-wrap gap-2">
                {heading.node.foods.map((s) => (
                  <span key={s} className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-sm">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 站点详情抽屉 */}
      {selected && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-white rounded-t-3xl shadow-2xl max-h-[62%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white rounded-t-3xl px-5 pt-3 pb-2 border-b border-slate-100">
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-3" />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-black text-slate-800">{selected.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{selected.province} · {selected.road}</div>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500">✕</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 font-semibold">环线第 {selected.cumKm.toLocaleString()} km</span>
              {selected.id < pack.nodes.length - 1 && (
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">距下一站 {pack.nodes[selected.id + 1].segKm} km</span>
              )}
              <span className={`px-2.5 py-1 rounded-full font-semibold ${selected.cumKm <= total ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {selected.cumKm <= total ? '已跑过 ✓' : `还差 ${(selected.cumKm - total).toLocaleString('zh-CN', { maximumFractionDigits: 0 })} km`}
              </span>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <div className="text-sm font-bold text-slate-700 mb-2">🏔 名胜古迹</div>
              <div className="flex flex-wrap gap-2">
                {selected.spots.map((s) => (
                  <span key={s} className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-700 mb-2">🍜 美食推荐</div>
              <div className="flex flex-wrap gap-2">
                {selected.foods.map((s) => (
                  <span key={s} className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-sm">{s}</span>
                ))}
              </div>
            </div>
            <div className="text-xs text-slate-400 pb-2">跑量 1:1 同步中国地图，跑到哪里就看到哪里的真实风物</div>
          </div>
        </div>
      )}
    </div>
  );
}
