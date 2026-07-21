// ============================================================
// E23跑起来 · 跑步页（Phase 1.2 - 户外/室内 + 目标 + GPS信号）
// 户外模式：真实GPS + 地图适配层 + GPS信号强度显示
// 室内模式：计时器 + 跑后手动填写距离（不启动GPS）
// 可选目标：距离/时长/热量，无目标默认，每次不继承
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { store, fmtPace, fmtDuration } from '../lib/store';
import { isApiEnabled } from '../api/client';
import { uploadActivity } from '../api/sync';
import GpsRun from '../providers/nativeGpsPlugin';

type Phase = 'idle' | 'countdown' | 'running' | 'paused' | 'done' | 'manual' | 'recover';
type RunMode = 'outdoor' | 'indoor';
type GoalType = 'NONE' | 'DISTANCE' | 'DURATION' | 'CALORIES';

const RUN_STATE_RUNNING = 1;

// GPS信号等级
type GpsLevel = 'off' | 'searching' | 'weak' | 'fair' | 'good' | 'excellent';

function gpsLevel(accuracy: number | null, lastCallbackSec: number): GpsLevel {
  if (lastCallbackSec > 15) return 'searching';
  if (accuracy == null) return 'searching';
  if (accuracy > 50) return 'weak';
  if (accuracy > 30) return 'fair';
  if (accuracy > 10) return 'good';
  return 'excellent';
}

function gpsColor(l: GpsLevel): string {
  return { off: 'bg-gray-400', searching: 'bg-red-500', weak: 'bg-orange-400', fair: 'bg-yellow-400', good: 'bg-lime-400', excellent: 'bg-emerald-400' }[l];
}
function gpsLabel(l: GpsLevel): string {
  return { off: 'GPS未开启', searching: '正在搜索', weak: '信号弱', fair: '信号一般', good: '信号良好', excellent: '信号优秀' }[l];
}

function newClientId() {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function RunPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [isNative, setIsNative] = useState(false);
  const [countdownN, setCountdownN] = useState(3);
  const [syncMsg, setSyncMsg] = useState('');
  const [runMode, setRunMode] = useState<RunMode>('outdoor');

  // 恢复相关
  const [recoverId, setRecoverId] = useState('');
  const [recoverDistanceM, setRecoverDistanceM] = useState(0);
  const [recoverStartMs, setRecoverStartMs] = useState(0);

  // GPS数据
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [lastCallbackSec, setLastCallbackSec] = useState(999);
  const [nativeDistanceM, setNativeDistanceM] = useState(0);
  const [nativeGpsPoints, setNativeGpsPoints] = useState(0);
  const [nativeRejectedPts, setNativeRejectedPts] = useState(0);
  const [gpsOK, setGpsOK] = useState(false);
  const [permissionTip, setPermissionTip] = useState('');

  // 目标
  const [goalType, setGoalType] = useState<GoalType>('NONE');
  const [goalValue, setGoalValue] = useState(0);
  const [goalShowConfig, setGoalShowConfig] = useState(false);

  // 室内跑距离输入
  const [indoorDistance, setIndoorDistance] = useState('');

  // 手动补录
  const [mDate, setMDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mKm, setMKm] = useState('');
  const [mMin, setMMin] = useState('');

  const geoTrail = useRef<Array<{ lat: number; lon: number; accuracyM: number | null; timestamp: string }>>([]);
  const startTs = useRef<number>(0);
  const nativeClientId = useRef<string>('');
  const [sec, setSec] = useState(0);
  const [meters, setMeters] = useState(0);
  const goalTimerRef = useRef<number>(0);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GpsRun'));
  }, []);

  // 异常恢复
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('GpsRun')) return;
    let alive = true;
    GpsRun.recoverActiveRun().then((r) => {
      if (!alive) return;
      if (r.activeRun && r.clientActivityId) {
        setRecoverId(r.clientActivityId);
        setRecoverDistanceM(r.totalDistanceM || 0);
        setRecoverStartMs(r.startTimeMs || 0);
        setPhase('recover');
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // GPS事件监听
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('GpsRun')) return;
    const cap = (window as any).Capacitor?.Plugins?.GpsRun;
    const h1 = cap?.addListener?.('statsUpdate', (data: any) => {
      if (!data) return;
      setNativeDistanceM(data.distanceM || 0);
      setNativeGpsPoints(data.gpsPoints || 0);
      setNativeRejectedPts(data.rejectedPts || data.rejectedPoints || 0);
    });
    const h2 = cap?.addListener?.('serviceStateChange', (data: any) => {
      if (!data) return;
      setGpsOK(data.state === RUN_STATE_RUNNING);
    });
    const h3 = cap?.addListener?.('activeRunDetected', (data: any) => {
      if (data?.activeRun && data.clientActivityId) {
        setRecoverId(data.clientActivityId);
        setRecoverDistanceM(data.totalDistanceM || 0);
        setRecoverStartMs(data.startTimeMs || 0);
        setPhase('recover');
      }
    });
    return () => { h1?.(); h2?.(); h3?.(); };
  }, []);

  // GPS心跳监控 - 检查最近一次回调时间
  useEffect(() => {
    if (phase !== 'running' || runMode !== 'outdoor') return;
    const iv = setInterval(() => {
      if (isNative) {
        GpsRun.getDiagnostics().then((d) => {
          setGpsAccuracy(d.lastAccuracy ?? null);
          if (d.lastLocationCallbackMs) {
            setLastCallbackSec((Date.now() - d.lastLocationCallbackMs) / 1000);
          } else {
            setLastCallbackSec(999);
          }
        }).catch(() => {});
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [phase, runMode, isNative]);

  // 计时
  useEffect(() => {
    if (phase !== 'running') return;
    const iv = setInterval(() => {
      if (isNative) {
        GpsRun.getCurrentStats().then((s) => {
          if (s.state === RUN_STATE_RUNNING) {
            setNativeDistanceM(s.distanceM || 0);
            setMeters(s.distanceM || 0);
            setSec(Math.round((s.durationMs || 0) / 1000));
          }
        }).catch(() => {});
      } else {
        setSec((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, isNative]);

  // 目标检测
  useEffect(() => {
    if (phase !== 'running' || goalType === 'NONE') return;
    const iv = setInterval(() => {
      const current = goalCurrent();
      if (goalValue > 0 && current >= goalValue) {
        // 尝试震动
        try { navigator.vibrate?.(500); } catch {}
      }
    }, 2000);
    goalTimerRef.current = iv as unknown as number;
    return () => clearInterval(iv);
  }, [phase, goalType, goalValue, meters, sec]);

  const goalCurrent = (): number => {
    if (goalType === 'DISTANCE') return meters;
    if (goalType === 'DURATION') return sec;
    if (goalType === 'CALORIES') return Math.round(meters * 0.062); // 简化估算
    return 0;
  };

  const km = meters / 1000;
  const avgPace = km > 0.01 ? sec / km : 0;
  const kcal = Math.round(km * 62);
  const gpsLevel_ = gpsLevel(isNative ? gpsAccuracy : null, lastCallbackSec);

  // 倒计时
  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdownN(3);
    const iv = setInterval(() => {
      setCountdownN((n) => {
        if (n <= 1) { clearInterval(iv); doStartRun(); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const doStartRun = async () => {
    const id = newClientId();
    geoTrail.current = [];
    startTs.current = Date.now();
    nativeClientId.current = id;
    setSyncMsg('');
    setSec(0);
    setMeters(0);
    setNativeDistanceM(0);

    if (runMode === 'outdoor' && isNative) {
      try { await GpsRun.startRun(); setPhase('running'); }
      catch { setGpsOK(false); setPermissionTip('原生GPS启动失败，请检查定位权限'); setPhase('idle'); }
    } else {
      setPhase('running');
    }
  };

  const togglePause = async () => {
    if (phase === 'running') {
      if (runMode === 'outdoor' && isNative) { try { await GpsRun.pauseRun(); } catch {} }
      setPhase('paused');
    } else if (phase === 'paused') {
      if (runMode === 'outdoor' && isNative) { try { await GpsRun.resumeRun(); } catch {} }
      setPhase('running');
    }
  };

  const finish = async () => {
    if (runMode === 'outdoor' && isNative) { try { await GpsRun.stopRun(); } catch {} }

    let finalKm = km;
    if (runMode === 'indoor') {
      finalKm = parseFloat(indoorDistance) || 0;
    }

    if (finalKm >= 0.05) {
      const startedAt = startTs.current || Date.now() - sec * 1000;
      store.addRecord({
        id: nativeClientId.current || newClientId(),
        ts: Date.now(), km: Math.round(finalKm * 100) / 100,
        durationSec: sec, avgPaceSec: Math.round(avgPace),
        source: runMode === 'indoor' ? 'manual' : 'gps',
        startedAt, syncState: 'local',
      });
      if (isApiEnabled() && store.user?.authMode === 'server') {
        uploadActivity({
          clientId: nativeClientId.current || newClientId(),
          source: runMode === 'indoor' ? 'manual' : 'gps',
          distanceM: Math.round(finalKm * 1000), durationSec: sec,
          startedAt: new Date(startedAt).toISOString(),
          endedAt: new Date().toISOString(),
          trackPoints: geoTrail.current.slice(0, 50000),
          evidenceNote: runMode === 'indoor' ? 'INDOOR_MANUAL_DISTANCE' : undefined,
        }).then((r) => {
          store.updateRecordSync(nativeClientId.current, r === 'ok' ? 'ok' : r === 'rejected' ? 'rejected' : 'queued');
          setSyncMsg(r === 'ok' ? '✅ 已上传' : '📥 已存入待同步队列');
        });
      } else {
        setSyncMsg('本机模式：记录已保存在本机');
      }
    }
    setPhase('done');
  };

  // 恢复
  const recoverResume = async () => {
    geoTrail.current = []; startTs.current = recoverStartMs;
    nativeClientId.current = recoverId; setPhase('running');
    if (isNative) { try { await GpsRun.resumeRun(); } catch {} }
  };
  const recoverFinish = async () => {
    if (isNative) { try { await GpsRun.stopRun(); } catch {} }
    const finalKm = recoverDistanceM / 1000;
    if (finalKm >= 0.05) {
      store.addRecord({ id: recoverId, ts: Date.now(), km: Math.round(finalKm * 100) / 100,
        durationSec: Math.round((Date.now() - recoverStartMs) / 1000), avgPaceSec: 0,
        source: 'gps', startedAt: recoverStartMs || Date.now(), syncState: 'local' });
    }
    setPhase('done');
  };
  const recoverDiscard = () => setPhase('idle');

  const saveManual = () => {
    const km_ = parseFloat(mKm); const min = parseFloat(mMin);
    if (!km_ || km_ <= 0 || !min || min <= 0) return;
    const ts = new Date(`${mDate}T12:00:00`).getTime();
    const start = isNaN(ts) ? Date.now() - min * 60 * 1000 : ts - min * 60 * 1000;
    const id = newClientId();
    store.addRecord({ id, ts: isNaN(ts) ? Date.now() : ts, km: Math.round(km_ * 100) / 100,
      durationSec: Math.round(min * 60), avgPaceSec: Math.round((min * 60) / km_), source: 'manual',
      startedAt: start, syncState: 'local' });
    if (isApiEnabled() && store.user?.authMode === 'server') {
      uploadActivity({ clientId: id, source: 'manual', distanceM: Math.round(km_ * 1000),
        durationSec: Math.round(min * 60), startedAt: new Date(start).toISOString(),
        endedAt: new Date(start + Math.round(min * 60) * 1000).toISOString(), evidenceNote: 'App手动补录',
      }).then((r) => { store.updateRecordSync(id, r === 'ok' ? 'ok' : r === 'rejected' ? 'rejected' : 'queued');
        setSyncMsg(r === 'ok' ? '✅ 已提交' : '📥 已存入待同步队列'); });
    } else setSyncMsg('本机模式：记录已保存在本机');
    setMKm(''); setMMin(''); setPhase('done');
  };

  // ===== 目标配置弹窗 =====
  const goalPanel = (<div className="px-4 mt-2">
    <button onClick={() => setGoalShowConfig(!goalShowConfig)}
      className="text-xs text-slate-400 underline underline-offset-2">
      {goalShowConfig ? '收起目标设置' : goalType !== 'NONE' ? '🎯 目标已设置' : '🎯 设置本次目标（可选）'}
    </button>
    {goalShowConfig && (
      <div className="mt-2 bg-slate-800 rounded-2xl p-3 space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {(['NONE', 'DISTANCE', 'DURATION', 'CALORIES'] as GoalType[]).map((t) => (
            <button key={t} onClick={() => { setGoalType(t); if (t === 'NONE') setGoalValue(0); }}
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${goalType === t ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
              {{ NONE: '无目标', DISTANCE: '距离', DURATION: '时长', CALORIES: '热量' }[t]}
            </button>
          ))}
        </div>
        {goalType === 'DISTANCE' && (
          <div className="space-y-1">
            <div className="flex gap-1 flex-wrap">
              {[3, 5, 10, 21.1, 42.2].map((v) => (
                <button key={v} onClick={() => setGoalValue(v * 1000)}
                  className={`px-2 py-0.5 rounded text-xs ${goalValue === v * 1000 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{v}km</button>
              ))}
            </div>
            <input type="number" placeholder="自定义公里" value={goalValue > 0 && ![3000,5000,10000,21100,42200].includes(goalValue) ? (goalValue / 1000).toString() : ''}
              onChange={(e) => { const v = parseFloat(e.target.value); if (v > 0 && v <= 200) setGoalValue(v * 1000); }}
              className="w-full px-2 py-1 rounded bg-slate-700 text-white text-xs outline-none" />
          </div>
        )}
        {goalType === 'DURATION' && (
          <div className="space-y-1">
            <div className="flex gap-1 flex-wrap">
              {[20, 30, 45, 60].map((v) => (
                <button key={v} onClick={() => setGoalValue(v * 60)}
                  className={`px-2 py-0.5 rounded text-xs ${goalValue === v * 60 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{v}分钟</button>
              ))}
            </div>
            <div className="flex gap-1">
              <input type="number" placeholder="小时" min="0" onChange={(e) => { const h = parseInt(e.target.value) || 0; const m = (goalValue / 60) % 60; setGoalValue((h * 60 + m) * 60); }}
                className="w-16 px-2 py-1 rounded bg-slate-700 text-white text-xs outline-none" />
              <span className="text-slate-500 text-xs self-center">时</span>
              <input type="number" placeholder="分钟" min="0" max="59" onChange={(e) => { const m = parseInt(e.target.value) || 0; const h = Math.floor(goalValue / 3600); setGoalValue((h * 60 + m) * 60); }}
                className="w-16 px-2 py-1 rounded bg-slate-700 text-white text-xs outline-none" />
              <span className="text-slate-500 text-xs self-center">分</span>
            </div>
          </div>
        )}
        {goalType === 'CALORIES' && (
          <div className="space-y-1">
            <div className="flex gap-1 flex-wrap">
              {[100, 200, 300, 500].map((v) => (
                <button key={v} onClick={() => setGoalValue(v)}
                  className={`px-2 py-0.5 rounded text-xs ${goalValue === v ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{v}千卡</button>
              ))}
            </div>
            <input type="number" placeholder="自定义千卡" value={![100,200,300,500].includes(goalValue) && goalValue > 0 ? goalValue : ''}
              onChange={(e) => { const v = parseInt(e.target.value); if (v > 0 && v <= 5000) setGoalValue(v); }}
              className="w-full px-2 py-1 rounded bg-slate-700 text-white text-xs outline-none" />
            <div className="text-[10px] text-slate-500">⚠️ 热量为估算值，根据距离×62粗略计算</div>
          </div>
        )}
        {goalType !== 'NONE' && goalValue > 0 && (
          <button onClick={() => { setGoalType('NONE'); setGoalValue(0); setGoalShowConfig(false); }}
            className="w-full py-1.5 rounded-full bg-slate-700 text-slate-300 text-xs font-bold active:bg-slate-600">清除目标</button>
        )}
        <div className="text-[10px] text-slate-500">目标仅本次有效，下次默认无目标</div>
      </div>
    )}
  </div>);

  // ===== 跑后摘要数据 =====
  const doneDistKm = runMode === 'indoor' ? (parseFloat(indoorDistance) || km) : km;

  // ===== 渲染各页面 =====
  if (phase === 'recover') {
    return (<div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white px-8">
      <div className="text-5xl mb-3">📋</div>
      <div className="text-xl font-bold mb-1">发现未完成跑步</div>
      <div className="text-sm text-slate-400 mb-6 text-center">
        上次跑步{recoverStartMs > 0 ? `于 ${new Date(recoverStartMs).toLocaleString('zh-CN')}` : ''} 尚未结束<br />
        已跑 {(recoverDistanceM / 1000).toFixed(2)} 公里
      </div>
      <div className="w-full max-w-xs space-y-3">
        <button onClick={recoverResume} className="w-full py-4 rounded-full bg-emerald-500 font-bold text-lg">继续跑步</button>
        <button onClick={recoverFinish} className="w-full py-4 rounded-full bg-orange-500 font-bold text-lg">结束并保存</button>
        <button onClick={recoverDiscard} className="w-full py-4 rounded-full bg-white/15 font-bold">放弃</button>
      </div>
    </div>);
  }

  if (phase === 'manual') {
    return (<div className="h-full flex flex-col bg-slate-900 text-white px-8 pt-10">
      <div className="text-xl font-bold mb-1">手动补录</div>
      <div className="text-xs text-slate-400 mb-6">补记真实发生的跑步，1:1 计入环线</div>
      <label className="text-xs text-slate-400 mb-1">日期</label>
      <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className="mb-4 px-4 py-3 rounded-xl bg-white/10 text-white outline-none" />
      <label className="text-xs text-slate-400 mb-1">距离（公里）</label>
      <input value={mKm} onChange={(e) => setMKm(e.target.value.replace(/[^\d.]/g,''))} placeholder="如 5.2" inputMode="decimal" className="mb-4 px-4 py-3 rounded-xl bg-white/10 text-white outline-none" />
      <label className="text-xs text-slate-400 mb-1">时长（分钟）</label>
      <input value={mMin} onChange={(e) => setMMin(e.target.value.replace(/[^\d.]/g,''))} placeholder="如 30" inputMode="decimal" className="mb-2 px-4 py-3 rounded-xl bg-white/10 text-white outline-none" />
      <div className="flex gap-3 mt-4">
        <button onClick={() => setPhase('idle')} className="flex-1 py-3.5 rounded-full bg-white/15 font-bold">取消</button>
        <button onClick={saveManual} className="flex-1 py-3.5 rounded-full bg-orange-500 font-bold">保存</button>
      </div>
    </div>);
  }

  if (phase === 'done') {
    return (<div className="h-full flex flex-col bg-slate-900 text-white overflow-y-auto">
      <div className="text-center pt-8 pb-4">
        <div className="text-5xl mb-3">🎉</div>
        <div className="text-xl font-bold mb-1">本次跑步完成</div>
        <div className="text-sm text-slate-400">{runMode === 'outdoor' ? 'GPS真实记录' : '室内跑步'}</div>
      </div>
      <div className="bg-white/10 rounded-2xl mx-5 p-5 space-y-3">
        <Row k="跑步模式" v={runMode === 'outdoor' ? '户外跑' : '室内跑'} />
        <Row k="总距离" v={`${doneDistKm.toFixed(2)} km`} />
        <Row k="总时长" v={fmtDuration(sec)} />
        <Row k="平均配速" v={fmtPace(avgPace)} />
        <Row k="消耗" v={`${kcal} 千卡`} />
        {goalType !== 'NONE' && goalValue > 0 && (
          <Row k="目标完成" v={goalCurrent() >= goalValue ? '✅ 已完成' : `${(goalCurrent() / goalValue * 100).toFixed(0)}%`} />
        )}
        {runMode === 'outdoor' && isNative && (
          <>
            <Row k="GPS有效点" v={String(nativeGpsPoints)} />
            <Row k="GPS无效点" v={String(nativeRejectedPts)} />
            <Row k="数据来源" v="E23 GPS（前台服务）" />
          </>
        )}
        {runMode === 'indoor' && <Row k="数据来源" v="INDOOR_MANUAL_DISTANCE" />}
      </div>
      {syncMsg && <div className="mt-3 mx-5 text-xs text-slate-300 text-center">{syncMsg}</div>}
      {!isNative && <div className="mx-5 mt-3 text-[10px] text-amber-400/70 text-center">⚠️ 浏览器模式数据仅供参考</div>}
      <button onClick={() => setPhase('idle')} className="mt-5 mx-5 py-4 rounded-full bg-orange-500 font-bold text-lg">返回</button>
    </div>);
  }

  // ===== 跑前页面（含模式/地图/目标/GPS信号） =====
  if (phase === 'idle') {
    return (<div className="h-full flex flex-col bg-slate-900 text-white overflow-y-auto">
      <div className="flex-1 flex flex-col items-center px-5 pt-6">
        {/* 模式切换 */}
        {!isNative ? (
          <div className="flex gap-3 mb-4">
            <ModeBtn active={false} label="📱 浏览器模式" sub="仅前台演示，不支持后台GPS" />
          </div>
        ) : (
          <div className="flex gap-3 mb-4">
            <ModeBtn active={runMode === 'outdoor'} onClick={() => setRunMode('outdoor')} label="🏃 户外跑" sub="真实GPS · 轨迹 · 地图" />
            <ModeBtn active={runMode === 'indoor'} onClick={() => setRunMode('indoor')} label="🏋️ 室内跑" sub="计时 · 跑后填距离" />
          </div>
        )}

        {runMode === 'outdoor' && isNative && (
          <>
            {/* GPS信号强度 */}
            <div className="w-full max-w-xs mb-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-800/50 border border-slate-700">
                <span className={`w-3 h-3 rounded-full ${gpsColor(gpsLevel_)} ${gpsLevel_ === 'searching' ? 'animate-pulse' : ''}`} />
                <span className="text-xs text-slate-300 font-bold">{gpsLabel(gpsLevel_)}</span>
                {gpsAccuracy != null && <span className="text-xs text-slate-500">精度约{gpsAccuracy.toFixed(0)}m</span>}
              </div>
              {lastCallbackSec > 15 && (
                <div className="text-[10px] text-amber-400/80 mt-1 px-2">
                  ⚠️ 超过{Math.round(lastCallbackSec)}秒未收到GPS定位，建议等待或切换至室内模式
                </div>
              )}
            </div>

            {/* 地图占位 - 地图适配层已预留 */}
            <div className="w-full max-w-xs h-32 rounded-2xl bg-slate-800/30 border border-slate-700 mb-3 flex items-center justify-center">
              <div className="text-center">
                <div className="text-slate-500 text-xs">📍 当前位置</div>
                <div className="text-slate-600 text-[10px] mt-1">地图Key待配置 - GPS记录不受影响</div>
              </div>
            </div>
          </>
        )}

        {/* 室内跑提示 */}
        {runMode === 'indoor' && (
          <div className="w-full max-w-xs mb-3 px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
            ⚠️ 室内跑不使用GPS定位。距离将在结束后手动填写。<br />
            跑后数据标记为 INDOOR_MANUAL_DISTANCE，不计为GPS验证数据。
          </div>
        )}

        {/* 目标设置 */}
        {goalPanel}

        {/* 权限提示 */}
        {permissionTip && (
          <div className="w-full max-w-xs mt-2 text-xs text-amber-300 px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30">⚠️ {permissionTip}</div>
        )}

        {/* 开始按钮 */}
        <button onClick={() => setPhase('countdown')} className="w-full max-w-xs mt-4 py-4 rounded-full bg-orange-500 text-lg font-black tracking-widest active:bg-orange-600 shadow-lg shadow-orange-500/30">
          {runMode === 'indoor' ? '开始室内跑' : '开始跑步'}
        </button>
        <button onClick={() => setPhase('manual')} className="mt-3 text-sm text-slate-400 underline underline-offset-4">手动补录一次跑步</button>
      </div>
      <div className="px-6 pb-4 text-center text-xs text-slate-600">
        {runMode === 'outdoor'
          ? (isNative ? 'E23原生GPS · Foreground Service · 锁屏/后台持续' : '浏览器演示模式')
          : '室内模式 · 手动填写距离 · 不启动GPS'}
      </div>
    </div>);
  }

  if (phase === 'countdown') {
    return (<div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="text-9xl font-black text-orange-500 animate-bounce">{countdownN > 0 ? countdownN : 'GO!'}</div>
      <div className="mt-8 text-slate-400 text-sm">{countdownN > 0 ? `${countdownN}秒后开始` : '跑起来！'}</div>
    </div>);
  }

  // ===== 跑中页面 =====
  const isPaused = phase === 'paused';
  const goalCur = goalCurrent();
  const goalPct = goalValue > 0 ? Math.min(100, (goalCur / goalValue) * 100) : 0;

  return (<div className="h-full flex flex-col bg-slate-900 text-white">
    {/* 顶部状态 */}
    <div className="flex items-center justify-between px-5 pt-4 pb-1">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-400' : !gpsOK ? 'bg-red-400' : 'bg-emerald-400'} ${!isPaused ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-slate-400">{isPaused ? '已暂停' : runMode === 'outdoor' ? (isNative ? 'GPS定位中' : '模拟') : '室内'}</span>
        {runMode === 'outdoor' && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${gpsColor(gpsLevel_)}`}>{gpsLabel(gpsLevel_)}</span>
        )}
      </div>
      <div className="text-xs text-slate-500">{runMode === 'outdoor' ? '户外' : '室内'}</div>
    </div>

    {/* 主数据 */}
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="text-7xl font-black tabular-nums tracking-tight">{(runMode === 'outdoor' && isNative && nativeDistanceM > 0 ? nativeDistanceM / 1000 : km).toFixed(2)}</div>
      <div className="text-slate-400 mt-1">公里</div>
      <div className="mt-4 grid grid-cols-3 gap-6 text-center">
        <div><div className="text-2xl font-bold tabular-nums">{fmtPace(avgPace)}</div><div className="text-xs text-slate-500 mt-0.5">平均配速</div></div>
        <div><div className="text-2xl font-bold tabular-nums">{fmtDuration(sec)}</div><div className="text-xs text-slate-500 mt-0.5">时长</div></div>
        <div><div className="text-2xl font-bold tabular-nums">{kcal}</div><div className="text-xs text-slate-500 mt-0.5">千卡</div></div>
      </div>

      {/* 目标进度 */}
      {goalType !== 'NONE' && goalValue > 0 && (
        <div className="mt-4 w-full max-w-xs">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{['距离目标','时长目标','热量目标'][goalType === 'DISTANCE' ? 0 : goalType === 'DURATION' ? 1 : 2]}</span>
            <span>{goalType === 'DISTANCE' ? `${(goalCur/1000).toFixed(2)}/${(goalValue/1000).toFixed(1)} km`
                  : goalType === 'DURATION' ? `${fmtDuration(goalCur)}/${fmtDuration(goalValue)}`
                  : `${goalCur}/${goalValue} 千卡`}</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${goalPct >= 100 ? 'bg-emerald-400' : 'bg-orange-400'}`} style={{width: `${goalPct}%`}} />
          </div>
          {goalPct >= 100 && <div className="text-xs text-emerald-400 mt-1 text-center">🎯 目标达成！</div>}
        </div>
      )}

      {runMode === 'outdoor' && isNative && (
        <div className="mt-3 text-xs text-slate-500">GPS点 {nativeGpsPoints} · 无效 {nativeRejectedPts}</div>
      )}

      {/* 室内跑距离输入提示 */}
      {runMode === 'indoor' && phase === 'paused' && (
        <div className="mt-3 text-xs text-amber-300">结束前请准备好跑步机显示的距离</div>
      )}
    </div>

    {/* 操作按钮 */}
    <div className="px-8 pb-10 flex gap-4">
      {phase === 'running' ? (
        <button onClick={togglePause} className="flex-1 py-4 rounded-full bg-amber-500 text-lg font-bold">暂停</button>
      ) : (
        <button onClick={togglePause} className="flex-1 py-4 rounded-full bg-emerald-500 text-lg font-bold">继续</button>
      )}
      {runMode === 'indoor' && phase !== 'running' ? (
        <div className="flex-1 flex items-center">
          <input value={indoorDistance} onChange={(e) => setIndoorDistance(e.target.value.replace(/[^\d.]/g,''))}
            placeholder="填写距离(km)" inputMode="decimal"
            className="w-full px-3 py-4 rounded-full bg-white/10 text-white text-sm outline-none text-center placeholder:text-slate-500" />
        </div>
      ) : null}
      <button onClick={finish} className={`py-4 rounded-full bg-white/15 text-lg font-bold ${runMode === 'indoor' ? 'px-4' : 'flex-1'}`}>
        {runMode === 'indoor' && phase === 'running' ? '结束并填距离' : '结束'}
      </button>
    </div>
    {runMode === 'indoor' && phase === 'running' && (
      <div className="px-8 pb-2 text-center text-[10px] text-slate-500">
        室内跑结束后需手动填写跑步机显示距离
      </div>
    )}
  </div>);
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-slate-400 text-sm">{k}</span><span className="font-bold tabular-nums">{v}</span></div>;
}

function ModeBtn({ active, onClick, label, sub }: { active: boolean; onClick?: () => void; label: string; sub: string }) {
  return (
    <button onClick={onClick} className={`flex-1 px-3 py-2.5 rounded-2xl border text-left transition ${active ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
      <div className={`text-sm font-bold ${active ? 'text-orange-400' : 'text-slate-300'}`}>{label}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </button>
  );
}
