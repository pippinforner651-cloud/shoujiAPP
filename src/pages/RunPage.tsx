import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { RunMap } from '../components/RunMap';
import { LiveGpsDiagnostics } from '../components/LiveGpsDiagnostics';
import { fmtDuration, fmtPace, store } from '../lib/store';
import { useRunSession } from '../run/useRunSession';
import type { GoalType, RunMode } from '../run/runSession';

const makeId = () => `local-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

export default function RunPage() {
  const nativeAvailable = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GpsRun');
  const run = useRunSession(undefined, nativeAvailable);
  const { state, diagnostics } = run;
  const [mode, setMode] = useState<RunMode>('outdoor');
  const [view, setView] = useState<'map' | 'data'>('map');
  const [follow, setFollow] = useState(true);
  const [message, setMessage] = useState('');
  const [indoorSec, setIndoorSec] = useState(0);
  const [indoorRunning, setIndoorRunning] = useState(false);
  const [indoorKm, setIndoorKm] = useState('');
  const [manual, setManual] = useState(false);
  const [manualKm, setManualKm] = useState('');
  const [manualMin, setManualMin] = useState('');

  useEffect(() => {
    if (!indoorRunning) return;
    const timer = window.setInterval(() => setIndoorSec((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [indoorRunning]);

  const setRunMode = (next: RunMode) => {
    if (state.phase !== 'idle') return;
    setMode(next);
    run.dispatch({ type: 'SET_MODE', mode: next });
  };

  const prepare = async () => {
    setMessage('');
    if (!nativeAvailable) { setMessage('当前设备不支持 Android 原生 GPS；苹果 Web 预览不支持锁屏后台持续记录。'); return; }
    try {
      const readiness = await run.prepareOutdoor();
      if (!readiness.ready) {
        if (readiness.locationPermission === 'denied') setMessage('定位权限未授权');
        else if (readiness.locationPermission === 'approximate') setMessage('仅大概位置，无法准确计距');
        else if (!readiness.systemLocationEnabled || !readiness.gpsEnabled) setMessage('手机定位未开启');
      } else {
        await run.refreshDiagnostics();
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'GPS准备失败'); }
  };

  const startOutdoor = async () => {
    try { await run.start(); } catch (error) { setMessage(error instanceof Error ? error.message : '开始失败'); }
  };

  const finishOutdoor = async () => {
    const result = await run.finish();
    const latest = result.snapshot;
    if (latest.distanceM >= 50 && latest.activityId) {
      store.addRecord({ id: latest.activityId, ts: Date.now(), km: Math.round(latest.distanceM) / 1000, durationSec: latest.durationSec, avgPaceSec: latest.distanceM > 0 ? latest.durationSec / (latest.distanceM / 1000) : 0, source: 'gps', startedAt: latest.startTimeMs, syncState: 'local' });
    }
    setMessage('跑步记录与轨迹已保存在本机');
  };

  const finishIndoor = () => {
    const km = Number(indoorKm);
    if (!(km > 0)) { setMessage('请输入跑步机显示的真实距离'); return; }
    store.addRecord({ id: makeId(), ts: Date.now(), km, durationSec: indoorSec, avgPaceSec: indoorSec / km, source: 'manual', startedAt: Date.now() - indoorSec * 1000, syncState: 'local' });
    setIndoorRunning(false); setMessage('室内跑已按跑步机距离保存');
  };

  const saveManual = () => {
    const km = Number(manualKm); const minutes = Number(manualMin);
    if (!(km > 0 && minutes > 0)) { setMessage('请输入有效距离和时长'); return; }
    store.addRecord({ id: makeId(), ts: Date.now(), km, durationSec: Math.round(minutes * 60), avgPaceSec: minutes * 60 / km, source: 'manual', startedAt: Date.now() - minutes * 60_000, syncState: 'local' });
    setManual(false); setManualKm(''); setManualMin(''); setMessage('手动记录已保存在本机');
  };

  const distanceM = mode === 'indoor' ? Number(indoorKm || 0) * 1000 : state.distanceM;
  const durationSec = mode === 'indoor' ? indoorSec : state.durationSec;
  const pace = distanceM > 0 ? durationSec / (distanceM / 1000) : 0;
  const kcal = Math.round(distanceM / 1000 * 62);
  const active = state.phase === 'running' || state.phase === 'paused';
  const gpsCallbacks = diagnostics?.gpsCallbackCount ?? 0;
  const canStartOutdoor = Boolean(diagnostics?.serviceRunning && diagnostics.locationRequestSucceeded && gpsCallbacks > 0);
  const hasFirstFix = Boolean(diagnostics?.firstFixReceived);

  return <div className="min-h-full bg-slate-950 text-white" style={{ paddingBottom: 'var(--page-bottom-reserve)' }}>
    <header className="px-5 pt-5 pb-3">
      <div className="text-xs tracking-[.22em] text-orange-400">E23 V2预览测试版</div>
      <h1 className="text-2xl font-black mt-1">跑起来</h1>
      <div className="grid grid-cols-2 gap-2 mt-4 rounded-2xl bg-slate-900 p-1">
        {(['outdoor', 'indoor'] as RunMode[]).map((item) => <button key={item} type="button" disabled={state.phase !== 'idle'} onClick={() => setRunMode(item)} className={`py-3 rounded-xl font-bold ${mode === item ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>{item === 'outdoor' ? '户外跑' : '室内跑'}</button>)}
      </div>
    </header>

    <main className="px-4 space-y-4">
      {mode === 'outdoor' && <>
        {(active || state.phase === 'done' || state.phase === 'recovery' || state.phase === 'waiting_gps') && <div className="flex justify-center gap-2">
          <button className={`px-5 py-2 rounded-full ${view === 'map' ? 'bg-white text-slate-900' : 'bg-slate-800'}`} onClick={() => setView('map')}>地图</button>
          <button className={`px-5 py-2 rounded-full ${view === 'data' ? 'bg-white text-slate-900' : 'bg-slate-800'}`} onClick={() => setView('data')}>数据</button>
        </div>}
        {view === 'map' && <RunMap mode={state.phase === 'done' ? 'post' : active ? 'running' : 'pre'} currentPoint={state.currentPoint} track={state.geoTrail} accuracyM={state.currentPoint?.accuracyM ?? null} follow={follow} onFollowChange={setFollow} onRenderedPointCount={(pointCount) => run.dispatch({ type: 'MAP_RENDERED', pointCount })} />}
        {(view === 'data' || (!state.currentPoint && state.phase === 'idle')) && <Metrics distanceM={distanceM} durationSec={durationSec} pace={pace} kcal={kcal} />}

        {state.phase === 'idle' && <><GoalEditor state={state} dispatch={run.dispatch} /><button className="w-full py-4 rounded-full bg-orange-500 text-lg font-black" onClick={prepare}>开始户外跑</button></>}
        {state.phase === 'waiting_gps' && <div className="rounded-3xl bg-slate-900 p-5 text-center"><div className="text-lg font-bold">正在获取真实 GPS</div><p className="text-sm text-slate-400 mt-2">此时尚未创建跑步记录；必须先收到真实GPS回调。</p><div className="mt-4"><LiveGpsDiagnostics diagnostics={diagnostics} pluginAvailable={nativeAvailable} uiDistanceM={state.distanceM} uiLocationEvents={state.locationEventCount} onOpenAppSettings={() => { void run.openAppLocationSettings(); }} onOpenLocationSettings={() => { void run.openSystemLocationSettings(); }} /></div>{!hasFirstFix && gpsCallbacks > 0 && <p className="mt-3 text-xs font-bold text-amber-300">GPS未就绪，当前不计距离</p>}<div className="grid grid-cols-2 gap-2 mt-4"><button className="py-3 rounded-full bg-slate-700" onClick={run.cancelPreparation}>取消</button><button disabled={!canStartOutdoor} className="py-3 rounded-full bg-orange-500 font-bold disabled:bg-slate-700 disabled:text-slate-500" onClick={startOutdoor}>{hasFirstFix ? '开始跑步' : gpsCallbacks > 0 ? '信号较弱，仍然开始' : '等待GPS回调'}</button></div></div>}
        {active && <>{!hasFirstFix && <div className="rounded-2xl border border-amber-700 bg-amber-950/50 px-4 py-3 text-sm font-bold text-amber-200">GPS未就绪，当前不计距离</div>}<Metrics distanceM={distanceM} durationSec={durationSec} pace={pace} kcal={kcal} /><LiveGpsDiagnostics diagnostics={diagnostics} pluginAvailable={nativeAvailable} uiDistanceM={state.distanceM} uiLocationEvents={state.locationEventCount} onOpenAppSettings={() => { void run.openAppLocationSettings(); }} onOpenLocationSettings={() => { void run.openSystemLocationSettings(); }} /><div className="grid grid-cols-2 gap-3"><button className="py-4 rounded-full bg-slate-700 font-bold" onClick={state.phase === 'paused' ? run.resume : run.pause}>{state.phase === 'paused' ? '继续' : '暂停'}</button><button className="py-4 rounded-full bg-orange-500 font-bold" onClick={finishOutdoor}>结束保存</button></div></>}
        {state.phase === 'recovery' && <div className="rounded-3xl bg-slate-900 p-5"><h2 className="font-black text-lg">发现未结束跑步</h2><p className="text-sm text-slate-400 mt-1">已恢复 {state.geoTrail.length} 个有效 GPS 点。</p><div className="grid grid-cols-3 gap-2 mt-4"><button className="py-3 rounded-xl bg-orange-500" onClick={run.resume}>继续</button><button className="py-3 rounded-xl bg-slate-700" onClick={finishOutdoor}>结束保存</button><button className="py-3 rounded-xl bg-red-900" onClick={run.abandon}>放弃留痕</button></div></div>}
        {state.phase === 'done' && <div className="rounded-3xl bg-slate-900 p-5 text-center"><div className="text-xl font-black">本次跑步完成</div><p className="text-sm text-slate-400 mt-2">SQLite有效轨迹 {state.geoTrail.length} 点 · 已渲染 {state.mapRenderedPointCount} 点</p><button className="mt-4 px-6 py-3 rounded-full bg-orange-500" onClick={() => run.dispatch({ type: 'RESET' })}>返回</button></div>}
      </>}

      {mode === 'indoor' && <><Metrics distanceM={distanceM} durationSec={durationSec} pace={pace} kcal={kcal} /><p className="text-xs text-slate-400 text-center">室内跑不启动GPS；热量按体重62kg估算，存在个体误差。</p>{!indoorRunning ? <button className="w-full py-4 rounded-full bg-orange-500 font-black" onClick={() => { setIndoorSec(0); setIndoorKm(''); setIndoorRunning(true); }}>开始室内计时</button> : <div className="space-y-3"><input value={indoorKm} onChange={(event) => setIndoorKm(event.target.value)} inputMode="decimal" placeholder="结束后填写跑步机距离（公里）" className="w-full rounded-2xl bg-slate-900 px-4 py-4"/><div className="grid grid-cols-2 gap-3"><button className="py-4 rounded-full bg-slate-700" onClick={() => setIndoorRunning(false)}>暂停计时</button><button className="py-4 rounded-full bg-orange-500" onClick={finishIndoor}>结束保存</button></div></div>}</>}

      <button className="w-full text-sm text-slate-400 underline" onClick={() => setManual((value) => !value)}>手动补录真实跑量</button>
      {manual && <div className="rounded-3xl bg-slate-900 p-4 space-y-3"><input value={manualKm} onChange={(event) => setManualKm(event.target.value)} inputMode="decimal" placeholder="距离（公里）" className="w-full rounded-xl bg-slate-800 px-4 py-3"/><input value={manualMin} onChange={(event) => setManualMin(event.target.value)} inputMode="decimal" placeholder="时长（分钟）" className="w-full rounded-xl bg-slate-800 px-4 py-3"/><button className="w-full py-3 rounded-full bg-orange-500 font-bold" onClick={saveManual}>保存补录</button></div>}
      {message && <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-amber-200">{message}</div>}
    </main>
  </div>;
}

function Metrics({ distanceM, durationSec, pace, kcal }: { distanceM: number; durationSec: number; pace: number; kcal: number }) {
  return <div className="rounded-3xl bg-slate-900 p-5"><div className="text-center"><div className="text-5xl font-black tabular-nums">{(distanceM / 1000).toFixed(2)}</div><div className="text-xs text-slate-400 mt-1">公里（真实1:1）</div></div><div className="grid grid-cols-3 gap-2 mt-5 text-center"><div><div className="font-bold">{fmtDuration(durationSec)}</div><span className="text-xs text-slate-500">时长</span></div><div><div className="font-bold">{fmtPace(pace)}</div><span className="text-xs text-slate-500">平均配速</span></div><div><div className="font-bold">≈{kcal}</div><span className="text-xs text-slate-500">千卡估算</span></div></div></div>;
}

function GoalEditor({ state, dispatch }: { state: { goalType: GoalType; goalValue: number }; dispatch: (event: { type: 'SET_GOAL'; goalType: Exclude<GoalType, 'NONE'>; goalValue: number } | { type: 'CLEAR_GOAL' }) => void }) {
  const [customVal, setCustomVal] = useState('');
  const goalType = state.goalType;
  const goalValue = state.goalValue;
  return <div className="rounded-2xl bg-slate-900 p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="font-bold text-sm">本次目标（可选）</span>
      {goalType !== 'NONE' && <button className="text-xs text-slate-400 underline" onClick={() => dispatch({ type: 'CLEAR_GOAL' })}>清除目标</button>}
    </div>
    {/* 目标类型选择 */}
    <div className="flex gap-1.5 flex-wrap mb-3">
      {(['NONE', 'DISTANCE', 'DURATION', 'CALORIES'] as GoalType[]).map((t) => (
        <button key={t} onClick={() => { if (t === 'NONE') dispatch({ type: 'CLEAR_GOAL' }); else dispatch({ type: 'SET_GOAL', goalType: t, goalValue: t === 'DISTANCE' ? 5000 : t === 'DURATION' ? 1800 : 300 }); setCustomVal(''); }}
          className={`px-2.5 py-1 rounded-full text-xs font-bold ${goalType === t ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
          {{ NONE: '无目标', DISTANCE: '距离', DURATION: '时长', CALORIES: '热量' }[t]}
        </button>
      ))}
    </div>
    {goalType === 'DISTANCE' && <div className="space-y-1.5">
      <div className="flex gap-1 flex-wrap">
        {[3, 5, 10, 21.1, 42.2].map(v => <button key={v} onClick={() => { dispatch({ type: 'SET_GOAL', goalType: 'DISTANCE', goalValue: v * 1000 }); setCustomVal(''); }}
          className={`px-2.5 py-1 rounded text-xs font-bold ${goalValue === v * 1000 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{v < 30 ? v + 'km' : v === 21.1 ? '半马' : '全马'}</button>)}
      </div>
      <input type="number" value={customVal} onChange={e => { const v = parseFloat(e.target.value); setCustomVal(e.target.value); if (v > 0 && v <= 200) dispatch({ type: 'SET_GOAL', goalType: 'DISTANCE', goalValue: v * 1000 }); }}
        placeholder="自定义公里数" className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white text-xs outline-none placeholder:text-slate-500" />
    </div>}
    {goalType === 'DURATION' && <div className="space-y-1.5">
      <div className="flex gap-1 flex-wrap">
        {[20, 30, 45, 60].map(v => <button key={v} onClick={() => { dispatch({ type: 'SET_GOAL', goalType: 'DURATION', goalValue: v * 60 }); setCustomVal(''); }}
          className={`px-2.5 py-1 rounded text-xs font-bold ${goalValue === v * 60 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{v}分钟</button>)}
      </div>
      <div className="flex gap-2 items-center">
        <input type="number" placeholder="时" min="0" onChange={e => { const h = parseInt(e.target.value) || 0; const m = Math.floor((goalValue % 3600) / 60); dispatch({ type: 'SET_GOAL', goalType: 'DURATION', goalValue: (h * 60 + m) * 60 }); }}
          className="w-16 px-3 py-2 rounded-xl bg-slate-800 text-white text-xs outline-none placeholder:text-slate-500" />
        <span className="text-xs text-slate-500">时</span>
        <input type="number" placeholder="分" min="0" max="59" onChange={e => { const m = parseInt(e.target.value) || 0; const h = Math.floor(goalValue / 3600); dispatch({ type: 'SET_GOAL', goalType: 'DURATION', goalValue: (h * 60 + m) * 60 }); }}
          className="w-16 px-3 py-2 rounded-xl bg-slate-800 text-white text-xs outline-none placeholder:text-slate-500" />
        <span className="text-xs text-slate-500">分</span>
      </div>
    </div>}
    {goalType === 'CALORIES' && <div className="space-y-1.5">
      <div className="flex gap-1 flex-wrap">
        {[100, 200, 300, 500].map(v => <button key={v} onClick={() => { dispatch({ type: 'SET_GOAL', goalType: 'CALORIES', goalValue: v }); setCustomVal(''); }}
          className={`px-2.5 py-1 rounded text-xs font-bold ${goalValue === v ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{v}kcal</button>)}
      </div>
      <input type="number" value={customVal} onChange={e => { const v = parseInt(e.target.value); setCustomVal(e.target.value); if (v > 0 && v <= 5000) dispatch({ type: 'SET_GOAL', goalType: 'CALORIES', goalValue: v }); }}
        placeholder="自定义千卡" className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white text-xs outline-none placeholder:text-slate-500" />
      <p className="text-[10px] text-slate-500">⚠️ 热量为估算值</p>
    </div>}
    <p className="text-[10px] text-slate-500 mt-2">目标仅本次有效，下次默认无目标</p>
  </div>;
}
