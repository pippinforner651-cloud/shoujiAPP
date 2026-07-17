import { useMemo, useState, useSyncExternalStore } from 'react';
import ChinaMap from '../components/ChinaMap';
import { store } from '../lib/store';
import { getActivePack } from '../lib/integrations';
import { positionAt, type RouteNode } from '../data/route';

function useStore() {
  return useSyncExternalStore((f) => store.subscribe(f), () => store);
}

export default function MapPage() {
  useStore();
  const [selected, setSelected] = useState<RouteNode | null>(null);
  const pack = useMemo(() => getActivePack(store.customPack), [store.customPack]);
  const total = store.teamTotalKm;
  const pos = useMemo(() => positionAt(total % pack.totalKm), [total, pack.totalKm]);
  const pct = Math.min(100, (total / pack.totalKm) * 100);

  const showCurrent = () => {
    // 当前位置处于 node→next 之间，展示即将到达/所在站点
    setSelected(pos.segProgress > 0.5 ? pos.next : pos.node);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部统计 */}
      <div className="px-4 pt-4 pb-3 bg-gradient-to-b from-emerald-50 to-transparent">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-slate-500">E23班环中国接力 · 累计</div>
            <div className="text-3xl font-black text-slate-800 leading-tight">
              {total.toLocaleString('zh-CN', { maximumFractionDigits: 1 })}
              <span className="text-base font-semibold text-slate-500 ml-1">km</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">环线总长</div>
            <div className="text-lg font-bold text-slate-700">{pack.totalKm.toLocaleString()} km</div>
          </div>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all" style={{ width: `${Math.max(0.5, pct)}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-slate-500">
          <span>已完成 <b className="text-orange-600">{pct.toFixed(2)}%</b>（1:1 真实跑量）</span>
          <span>今日班级 <b className="text-emerald-600">+{store.teamTodayKm.toFixed(1)} km</b> · {store.todayCheckins} 人打卡</span>
        </div>
      </div>

      {/* 地图 */}
      <div className="flex-1 relative bg-[#F4F8F6]">
        <ChinaMap pack={pack} progressKm={total} onSelectNode={setSelected} selectedNode={selected} />
        {/* 当前位置卡 */}
        <button
          onClick={showCurrent}
          className="absolute left-3 bottom-3 right-3 sm:right-auto sm:w-80 bg-white/95 backdrop-blur rounded-2xl shadow-lg px-4 py-3 text-left active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </span>
            <span className="text-xs text-slate-500">班级当前位置（第 {Math.floor(total % pack.totalKm).toLocaleString()} km）</span>
          </div>
          <div className="mt-1 font-bold text-slate-800">
            {pos.node.name} → {pos.next.name}
            <span className="ml-2 text-xs font-normal text-slate-500">{pos.next.road}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">点击查看当前位置详情、名胜古迹与美食 →</div>
        </button>
      </div>

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
            <div className="mt-2 flex gap-4 text-xs">
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
