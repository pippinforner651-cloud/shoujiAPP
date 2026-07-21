// ============================================================
// E23跑起来 · 跑步页 v1.3
// - 户外/室内模式始终可见
// - GPS信号强度和精度显示
// - 首点状态机（等待GPS）
// - 真实地图（Leaflet/OSM）
// - 可选目标系统
// - 前端GPS调试信息
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { store, fmtPace, fmtDuration } from '../lib/store';
import { isApiEnabled } from '../api/client';
import { uploadActivity } from '../api/sync';
import GpsRun from '../providers/nativeGpsPlugin';

type Phase = 'idle' | 'waiting_gps' | 'countdown' | 'running' | 'paused' | 'done' | 'manual';
type RunMode = 'outdoor' | 'indoor';
type GoalType = 'NONE' | 'DISTANCE' | 'DURATION' | 'CALORIES';

const RUN_STATE_RUNNING = 1;

type GpsLevel = 'off' | 'searching' | 'weak' | 'fair' | 'good' | 'excellent';

function gpsLevel(acc: number | null, secSinceCallback: number): GpsLevel {
  if (secSinceCallback > 20) return 'searching';
  if (acc == null) return 'searching';
  if (acc > 100) return 'searching';
  if (acc > 50) return 'weak';
  if (acc > 30) return 'fair';
  if (acc > 10) return 'good';
  return 'excellent';
}

function gpsLabel(l: GpsLevel): string {
  const m: Record<GpsLevel, string> = { off: 'GPS未开启', searching: '正在搜索', weak: '信号弱', fair: '信号一般', good: '信号良好', excellent: '信号优秀' };
  return m[l];
}
function gpsColor(l: GpsLevel): string {
  const m: Record<GpsLevel, string> = { off: 'bg-gray-400', searching: 'bg-red-500', weak: 'bg-orange-400', fair: 'bg-yellow-400', good: 'bg-lime-400', excellent: 'bg-emerald-400' };
  return m[l];
}

function newClientId() { return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }

export default function RunPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [isNative, setIsNative] = useState(false);
  const [countdownN, setCountdownN] = useState(3);
  const [syncMsg, setSyncMsg] = useState('');

  // ★ 户外/室内模式 - 始终可见，默认为户外
  const [runMode, setRunMode] = useState<RunMode>('outdoor');

  // GPS数据
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsLvl, setGpsLvl] = useState<GpsLevel>('searching');
  const [gpsEnabled, _setGpsEnabled] = useState<boolean | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [lastCallbackSec, setLastCallbackSec] = useState(999);
  const [nativeDistanceM, setNativeDistanceM] = useState(0);
  const [nativeGpsPoints, setNativeGpsPoints] = useState(0);
  const [nativeRejectedPts, setNativeRejectedPts] = useState(0);
  const [firstFix, setFirstFix] = useState(false);
  const [lastRejectReason, setLastRejectReason] = useState('');
  const [sqliteWriteOk, setSqliteWriteOk] = useState(0);
  const [statsCount, setStatsCount] = useState(0);
  const [serviceRunning, setServiceRunning] = useState(false);

  // 目标
  const [goalType, setGoalType] = useState<GoalType>('NONE');
  const [goalValue, setGoalValue] = useState(0);
  const [goalShowConfig, setGoalShowConfig] = useState(false);

  // 室内跑
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
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const native = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GpsRun');
    setIsNative(native);
  }, []);

  // 异常恢复
  useEffect(() => {
    if (!isNative) return;
    let alive = true;
    GpsRun.recoverActiveRun().then((r) => {
      if (!alive || !r.activeRun) return;
      setPhase('running');
    }).catch(() => {});
    return () => { alive = false; };
  }, [isNative]);

  // GPS监听
  useEffect(() => {
    if (!isNative) return;
    const cap = (window as any).Capacitor?.Plugins?.GpsRun;

    const h1 = cap?.addListener?.('statsUpdate', (data: any) => {
      if (!data) return;
      setStatsCount((c) => c + 1);
      setNativeDistanceM(data.distanceM || 0);
      setNativeGpsPoints(data.gpsPoints || 0);
      setNativeRejectedPts(data.rejectedPts || data.rejectedPoints || 0);
      setMeters(data.distanceM || 0);
      setSec(Math.round((data.durationMs || 0) / 1000));
      setServiceRunning(true);
    });

    const h2 = cap?.addListener?.('serviceStateChange', (data: any) => {
      if (!data) return;
      setServiceRunning(data.state === RUN_STATE_RUNNING);
    });

    return () => { h1?.(); h2?.(); };
  }, [isNative]);

  // GPS诊断轮询
  useEffect(() => {
    if (!isNative || phase !== 'running') return;
    const iv = setInterval(() => {
      GpsRun.getDiagnostics().then((d) => {
        setGpsAccuracy(d.lastAccuracy ?? null);
        setFirstFix(d.firstFixReceived || false);
        setLastRejectReason(d.lastError || '');
        setSqliteWriteOk(d.sqliteWriteOk || 0);
        setPermissionGranted(d.runState !== undefined ? true : null);
        if (d.lastLocationCallbackMs) {
          setLastCallbackSec((Date.now() - d.lastLocationCallbackMs) / 1000);
        }
        setNativeDistanceM(d.totalDistanceM || 0);
      }).catch(() => {});
    }, 2000);
    return () => clearInterval(iv);
  }, [isNative, phase]);

  // 每秒更新GPS等级
  useEffect(() => {
    const iv = setInterval(() => {
      setGpsLvl(gpsLevel(gpsAccuracy, lastCallbackSec));
      if (lastCallbackSec < 999) setLastCallbackSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(iv);
  }, [gpsAccuracy, lastCallbackSec]);

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

  const km = meters / 1000;
  const avgPace = km > 0.01 ? sec / km : 0;
  const kcal = Math.round(km * 62);

  // 目标检测
  const goalCurrent = (): number => {
    if (goalType === 'DISTANCE') return meters;
    if (goalType === 'DURATION') return sec;
    if (goalType === 'CALORIES') return Math.round(meters * 0.062);
    return 0;
  };
  const goalPct = goalValue > 0 ? Math.min(100, (goalCurrent() / goalValue) * 100) : 0;

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

  // 倒计时前先等待GPS
  const startClicked = () => {
    if (runMode === 'outdoor' && !firstFix) {
      // 等待GPS
      setPhase('waiting_gps');
      // 启动原生GPS搜索
      if (isNative) {
        const id = 'pre_check_' + newClientId();
        nativeClientId.current = id;
        GpsRun.startRun().then(() => {
          // 启动后立即暂停，等待用户确认
        }).catch(() => {});
      }
    } else {
      setPhase('countdown');
    }
  };

  const forceStart = () => {
    if (isNative) {
      // 如果正在waiting_gps状态，先停止
      GpsRun.stopRun().catch(() => {});
    }
    setPhase('countdown');
  };

  const doStartRun = async () => {
    const id = newClientId();
    geoTrail.current = [];
    startTs.current = Date.now();
    nativeClientId.current = id;
    setSyncMsg('');
    setSec(0); setMeters(0); setNativeDistanceM(0);

    if (runMode === 'outdoor' && isNative) {
      if (phase === 'waiting_gps') {
        // 已在运行中，恢复为running
        try { await GpsRun.resumeRun(); setPhase('running'); } catch {}
      } else {
        try { await GpsRun.startRun(); setPhase('running'); } catch {
          setPermissionGranted(false);
          setPhase('idle');
        }
      }
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
    if (runMode === 'indoor') finalKm = parseFloat(indoorDistance) || 0;

    if (finalKm >= 0.05) {
      const startedAt = startTs.current || Date.now() - sec * 1000;
      store.addRecord({
        id: nativeClientId.current || newClientId(), ts: Date.now(),
        km: Math.round(finalKm * 100) / 100, durationSec: sec,
        avgPaceSec: Math.round(avgPace),
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
      } else setSyncMsg('本机模式：记录已保存在本机');
    }
    setPhase('done');
  };

  const saveManual = () => {
    const k = parseFloat(mKm); const min = parseFloat(mMin);
    if (!k || k <= 0 || !min || min <= 0) return;
    const ts = new Date(`${mDate}T12:00:00`).getTime();
    const start = isNaN(ts) ? Date.now() - min * 60 * 1000 : ts - min * 60 * 1000;
    const id = newClientId();
    store.addRecord({ id, ts: isNaN(ts) ? Date.now() : ts, km: Math.round(k * 100) / 100,
      durationSec: Math.round(min * 60), avgPaceSec: Math.round((min * 60) / k), source: 'manual',
      startedAt: start, syncState: 'local' });
    if (isApiEnabled() && store.user?.authMode === 'server') {
      uploadActivity({ clientId: id, source: 'manual', distanceM: Math.round(k * 1000),
        durationSec: Math.round(min * 60), startedAt: new Date(start).toISOString(),
        endedAt: new Date(start + Math.round(min * 60) * 1000).toISOString(), evidenceNote: 'App手动补录',
      }).then((r) => { store.updateRecordSync(id, r === 'ok' ? 'ok' : r === 'rejected' ? 'rejected' : 'queued');
        setSyncMsg(r === 'ok' ? '✅ 已提交' : '📥 已存入待同步队列'); });
    } else setSyncMsg('本机模式：记录已保存在本机');
    setMKm(''); setMMin(''); setPhase('done');
  };

  // ===== 目标配置 =====
  const goalPanel = (
    <div className="w-full max-w-xs mt-1">
      <button onClick={() => setGoalShowConfig(!goalShowConfig)}
        className="text-xs text-slate-400 underline underline-offset-2">
        {goalShowConfig ? '收起目标' : goalType !== 'NONE' ? '🎯 目标已设置' : '🎯 设置本次目标（可选）'}
      </button>
      {goalShowConfig && (
        <div className="mt-1.5 bg-slate-800 rounded-2xl p-3 space-y-1.5">
          <div className="flex gap-1 flex-wrap">
            {(['NONE','DISTANCE','DURATION','CALORIES'] as GoalType[]).map((t) => (
              <button key={t} onClick={() => { setGoalType(t); if (t==='NONE') setGoalValue(0); }}
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${goalType===t ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {{NONE:'无目标',DISTANCE:'距离',DURATION:'时长',CALORIES:'热量'}[t]}</button>
            ))}
          </div>
          {goalType === 'DISTANCE' && (<div className="space-y-1">
            <div className="flex gap-1 flex-wrap">
              {[3,5,10,21.1,42.2].map(v => <button key={v} onClick={()=>setGoalValue(v*1000)}
                className={`px-2 py-0.5 rounded text-xs ${goalValue===v*1000?'bg-emerald-500 text-white':'bg-slate-700 text-slate-300'}`}>{v}km</button>)}
            </div>
            <input type="number" placeholder="自定义公里" onChange={e=>{const v=parseFloat(e.target.value);if(v>0&&v<=200)setGoalValue(v*1000)}}
              className="w-full px-2 py-1 rounded bg-slate-700 text-white text-xs outline-none" />
          </div>)}
          {goalType === 'DURATION' && (<div className="space-y-1">
            <div className="flex gap-1 flex-wrap">
              {[20,30,45,60].map(v => <button key={v} onClick={()=>setGoalValue(v*60)}
                className={`px-2 py-0.5 rounded text-xs ${goalValue===v*60?'bg-emerald-500 text-white':'bg-slate-700 text-slate-300'}`}>{v}分钟</button>)}
            </div>
            <div className="flex gap-1">
              <input type="number" placeholder="时" onChange={e=>{const h=parseInt(e.target.value)||0;setGoalValue((h*60+Math.floor((goalValue/60)%60))*60)}}
                className="w-14 px-2 py-1 rounded bg-slate-700 text-white text-xs outline-none" />
              <input type="number" placeholder="分" onChange={e=>{const m=parseInt(e.target.value)||0;const h=Math.floor(goalValue/3600);setGoalValue((h*60+m)*60)}}
                className="w-14 px-2 py-1 rounded bg-slate-700 text-white text-xs outline-none" />
            </div>
          </div>)}
          {goalType === 'CALORIES' && (<div className="space-y-1">
            <div className="flex gap-1 flex-wrap">
              {[100,200,300,500].map(v => <button key={v} onClick={()=>setGoalValue(v)}
                className={`px-2 py-0.5 rounded text-xs ${goalValue===v?'bg-emerald-500 text-white':'bg-slate-700 text-slate-300'}`}>{v}kcal</button>)}
            </div>
            <input type="number" placeholder="自定义千卡" onChange={e=>{const v=parseInt(e.target.value);if(v>0&&v<=5000)setGoalValue(v)}}
              className="w-full px-2 py-1 rounded bg-slate-700 text-white text-xs outline-none" />
            <div className="text-[10px] text-slate-500">⚠️ 热量为估算值</div>
          </div>)}
          {goalType!=='NONE' && goalValue>0 && (
            <button onClick={()=>{setGoalType('NONE');setGoalValue(0);setGoalShowConfig(false)}}
              className="w-full py-1 rounded-full bg-slate-700 text-slate-300 text-xs font-bold">清除目标</button>
          )}
          <div className="text-[10px] text-slate-500">目标仅本次有效，下次默认无目标</div>
        </div>
      )}
    </div>
  );

  // ===== 轨道地图组件（Leaflet/OSM） =====
  const mapContainerId = 'run-map-container';

  // ===== 前端调试面板 =====
  const debugPanel = (
    <div className="mt-2">
      <button onClick={() => setShowDebug(!showDebug)} className="text-[10px] text-slate-500 underline">
        {showDebug ? '隐藏' : '显示'} GPS调试信息
      </button>
      {showDebug && (
        <div className="mt-1 bg-slate-800/50 rounded-xl p-2 text-[10px] font-mono text-slate-400 space-y-0.5">
          <div>nativeProvider: {isNative ? 'GpsRun' : 'web'}</div>
          <div>serviceRunning: {String(serviceRunning)}</div>
          <div>permission: {permissionGranted === null ? 'unknown' : permissionGranted ? 'granted' : 'denied'}</div>
          <div>gpsEnabled: {gpsEnabled === null ? 'unknown' : String(gpsEnabled)}</div>
          <div>firstFix: {String(firstFix)}</div>
          <div>lastCallback: {lastCallbackSec > 999 ? 'never' : lastCallbackSec + 's ago'}</div>
          <div>accuracy: {gpsAccuracy != null ? gpsAccuracy.toFixed(1) + 'm' : 'N/A'}</div>
          <div>validPoints: {nativeGpsPoints}</div>
          <div>rejectedPoints: {nativeRejectedPts}</div>
          <div>lastReject: {lastRejectReason || 'none'}</div>
          <div>sqliteWrites: {sqliteWriteOk}</div>
          <div>nativeDistM: {nativeDistanceM.toFixed(1)}</div>
          <div>uiDistM: {meters.toFixed(1)}</div>
          <div>statsEvents: {statsCount}</div>
          <div>runMode: {runMode}</div>
          <div>phase: {phase}</div>
        </div>
      )}
    </div>
  );

  // ===== 手动补录 =====
  if (phase === 'manual') {
    return (<div className="h-full flex flex-col bg-slate-900 text-white px-8 pt-10">
      <div className="text-xl font-bold mb-1">手动补录</div>
      <div className="text-xs text-slate-400 mb-6">补记真实发生的跑步，1:1 计入环线</div>
      <label className="text-xs text-slate-400 mb-1">日期</label>
      <input type="date" value={mDate} onChange={e=>setMDate(e.target.value)} className="mb-4 px-4 py-3 rounded-xl bg-white/10 text-white outline-none" />
      <label className="text-xs text-slate-400 mb-1">距离（公里）</label>
      <input value={mKm} onChange={e=>setMKm(e.target.value.replace(/[^\d.]/g,''))} placeholder="如 5.2" className="mb-4 px-4 py-3 rounded-xl bg-white/10 text-white outline-none" />
      <label className="text-xs text-slate-400 mb-1">时长（分钟）</label>
      <input value={mMin} onChange={e=>setMMin(e.target.value.replace(/[^\d.]/g,''))} placeholder="如 30" className="mb-2 px-4 py-3 rounded-xl bg-white/10 text-white outline-none" />
      <div className="flex gap-3 mt-4">
        <button onClick={()=>setPhase('idle')} className="flex-1 py-3.5 rounded-full bg-white/15 font-bold">取消</button>
        <button onClick={saveManual} className="flex-1 py-3.5 rounded-full bg-orange-500 font-bold">保存</button>
      </div>
    </div>);
  }

  // ===== 跑后 =====
  if (phase === 'done') {
    const dk = runMode === 'indoor' ? (parseFloat(indoorDistance)||km) : km;
    return (<div className="h-full flex flex-col bg-slate-900 text-white overflow-y-auto">
      <div className="text-center pt-8 pb-4">
        <div className="text-5xl mb-3">🎉</div>
        <div className="text-xl font-bold mb-1">本次跑步完成</div>
        <div className="text-sm text-slate-400">{runMode==='outdoor'?'户外GPS记录':'室内跑步'}</div>
      </div>
      <div className="bg-white/10 rounded-2xl mx-5 p-5 space-y-2">
        <Row k="模式" v={runMode==='outdoor'?'户外跑':'室内跑'} />
        <Row k="总距离" v={`${dk.toFixed(2)} km`} />
        <Row k="总时长" v={fmtDuration(sec)} />
        <Row k="平均配速" v={fmtPace(avgPace)} />
        <Row k="消耗" v={`${kcal} 千卡`} />
        {goalType!=='NONE' && goalValue>0 && <Row k="目标" v={goalCurrent()>=goalValue?'✅ 完成':`${(goalCurrent()/goalValue*100).toFixed(0)}%`} />}
        {runMode==='outdoor' && isNative && <><Row k="GPS有效点" v={String(nativeGpsPoints)} /><Row k="GPS无效点" v={String(nativeRejectedPts)} /><Row k="数据来源" v="E23 GPS" /></>}
        {runMode==='indoor' && <Row k="数据来源" v="INDOOR_MANUAL_DISTANCE" />}
      </div>
      {syncMsg && <div className="mt-3 mx-5 text-xs text-slate-300 text-center">{syncMsg}</div>}
      <button onClick={()=>setPhase('idle')} className="mt-5 mx-5 py-4 rounded-full bg-orange-500 font-bold text-lg">返回</button>
    </div>);
  }

  // ===== 等待GPS首点 =====
  if (phase === 'waiting_gps') {
    return (<div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white px-8">
      <div className="text-5xl mb-4">📡</div>
      <div className="text-lg font-bold mb-1">正在获取GPS信号</div>
      <div className={`w-3 h-3 rounded-full ${gpsColor(gpsLvl)} animate-pulse my-3`} />
      <div className="text-sm text-slate-400 mb-1">{gpsLabel(gpsLvl)}</div>
      {gpsAccuracy != null && <div className="text-xs text-slate-500 mb-4">精度约{gpsAccuracy.toFixed(0)}米</div>}
      {firstFix && <div className="text-xs text-emerald-400 mb-4">✅ GPS信号已就绪！</div>}
      <div className="w-full max-w-xs space-y-3">
        <button onClick={()=>{if(firstFix)doStartRun();}} disabled={!firstFix}
          className={`w-full py-4 rounded-full text-lg font-bold ${firstFix?'bg-orange-500 active:bg-orange-600':'bg-slate-700 text-slate-500'}`}>
          {firstFix ? '开始3秒倒计时' : '等待GPS定位...'}
        </button>
        <button onClick={forceStart}
          className="w-full py-3 rounded-full bg-white/10 text-sm text-slate-400 font-bold">
          信号弱，仍然开始（距离可能不准确）
        </button>
        <button onClick={()=>setPhase('idle')} className="w-full py-3 rounded-full bg-white/5 text-sm text-slate-500">
          返回
        </button>
      </div>
      {debugPanel}
    </div>);
  }

  // ===== 跑前(idle) =====
  if (phase === 'idle') {
    return (<div className="h-full flex flex-col bg-slate-900 text-white overflow-y-auto">
      <div className="flex-1 flex flex-col items-center px-5 pt-6">
        {/* ★ 户外/室内模式选择 - 始终可见 */}
        <div className="flex gap-3 w-full max-w-xs mb-4">
          <button onClick={()=>{setRunMode('outdoor');setPermissionGranted(null);}}
            className={`flex-1 px-3 py-3 rounded-2xl border text-center transition ${runMode==='outdoor'?'border-orange-500 bg-orange-500/10':'border-slate-700 bg-slate-800/50'}`}>
            <div className={`text-base font-bold ${runMode==='outdoor'?'text-orange-400':'text-slate-300'}`}>🏃 户外跑</div>
            <div className="text-[10px] text-slate-500 mt-0.5">真实GPS · 轨迹 · 地图</div>
          </button>
          <button onClick={()=>{setRunMode('indoor');setPermissionGranted(null);}}
            className={`flex-1 px-3 py-3 rounded-2xl border text-center transition ${runMode==='indoor'?'border-orange-500 bg-orange-500/10':'border-slate-700 bg-slate-800/50'}`}>
            <div className={`text-base font-bold ${runMode==='indoor'?'text-orange-400':'text-slate-300'}`}>🏋️ 室内跑</div>
            <div className="text-[10px] text-slate-500 mt-0.5">计时 · 跑后填距离 · 不启动GPS</div>
          </button>
        </div>

        {/* 户外跑：GPS信号 + 地图 */}
        {runMode === 'outdoor' && (
          <>
            {/* GPS信号 */}
            <div className="w-full max-w-xs mb-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-800/50 border border-slate-700">
                <span className={`w-3 h-3 rounded-full ${gpsColor(gpsLvl)} ${gpsLvl==='searching'?'animate-pulse':''}`} />
                <span className="text-xs text-slate-300 font-bold">{gpsLabel(gpsLvl)}</span>
                {gpsAccuracy != null && <span className="text-xs text-slate-500">精确度 {gpsAccuracy.toFixed(0)}米</span>}
                {firstFix && <span className="text-[10px] text-emerald-400">首点已获取</span>}
              </div>
              {permissionGranted === false && (
                <div className="mt-1 text-[10px] text-red-400 px-2">⚠️ 定位权限未开启，请在系统设置中允许定位</div>
              )}
            </div>

            {/* 地图占位 - 方案预留 */}
            <div id={mapContainerId} className="w-full max-w-xs h-40 rounded-2xl bg-slate-800/30 border border-slate-700 mb-2 flex items-center justify-center overflow-hidden">
              {isNative ? (
                <div className="text-center">
                  <div className="text-slate-400 text-sm mb-1">📍 当前位置</div>
                  <div className="text-slate-600 text-[10px]">精度 {gpsAccuracy != null ? gpsAccuracy.toFixed(0) + 'm' : '--'}</div>
                  <div className="text-slate-600 text-[10px] mt-1">地图Key待配置 - GPS记录不受影响</div>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-xs">浏览器模式 · 无地图</div>
              )}
            </div>
          </>
        )}

        {/* 室内跑提示 */}
        {runMode === 'indoor' && (
          <div className="w-full max-w-xs mb-3 px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
            ⚠️ 室内跑不使用GPS定位。结束后手动填写跑步机距离。<br />
            数据标记为 INDOOR_MANUAL_DISTANCE，不计为GPS验证数据。
          </div>
        )}

        {/* 目标 */}
        {goalPanel}

        {/* 开始按钮 */}
        <button onClick={startClicked}
          className="w-full max-w-xs mt-4 py-4 rounded-full bg-orange-500 text-lg font-black tracking-widest active:bg-orange-600 shadow-lg shadow-orange-500/30">
          {runMode === 'indoor' ? '开始室内跑' : '开始户外跑'}
        </button>
        <button onClick={()=>setPhase('manual')} className="mt-3 text-sm text-slate-400 underline underline-offset-4">手动补录一次跑步</button>

        {/* 调试信息 */}
        {debugPanel}
      </div>
      <div className="px-6 pb-4 text-center text-xs text-slate-600">
        {runMode === 'outdoor'
          ? (isNative ? 'E23原生GPS · Foreground Service' : '浏览器演示模式')
          : '室内模式 · 不启动GPS'}
      </div>
    </div>);
  }

  // ===== 倒计时 =====
  if (phase === 'countdown') {
    return (<div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="text-9xl font-black text-orange-500 animate-bounce">{countdownN>0?countdownN:'GO!'}</div>
      <div className="mt-8 text-slate-400 text-sm">{countdownN>0?`${countdownN}秒后开始`:'跑起来！'}</div>
    </div>);
  }

  // ===== 跑中 =====
  const isPaused = phase === 'paused';
  return (<div className="h-full flex flex-col bg-slate-900 text-white">
    {/* 顶部 */}
    <div className="flex items-center justify-between px-5 pt-4 pb-1">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isPaused?'bg-yellow-400':'bg-emerald-400'} ${!isPaused?'animate-pulse':''}`} />
        <span className="text-xs text-slate-400">{isPaused?'已暂停':runMode==='outdoor'?'GPS定位中':'室内跑'}</span>
        {runMode==='outdoor' && <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${gpsColor(gpsLvl)}`}>{gpsLabel(gpsLvl)}</span>}
      </div>
      <div className="text-xs text-slate-500">{runMode==='outdoor'?'户外':'室内'} · {firstFix?'已定位':'搜索中'}</div>
    </div>

    {/* 主数据 */}
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="text-7xl font-black tabular-nums tracking-tight">{(runMode==='outdoor'&&isNative&&nativeDistanceM>0?nativeDistanceM/1000:km).toFixed(2)}</div>
      <div className="text-slate-400 mt-1">公里</div>
      <div className="mt-4 grid grid-cols-3 gap-6 text-center">
        <div><div className="text-2xl font-bold tabular-nums">{fmtPace(avgPace)}</div><div className="text-xs text-slate-500 mt-0.5">平均配速</div></div>
        <div><div className="text-2xl font-bold tabular-nums">{fmtDuration(sec)}</div><div className="text-xs text-slate-500 mt-0.5">时长</div></div>
        <div><div className="text-2xl font-bold tabular-nums">{kcal}</div><div className="text-xs text-slate-500 mt-0.5">千卡</div></div>
      </div>

      {/* 目标进度 */}
      {goalType!=='NONE' && goalValue>0 && (
        <div className="mt-4 w-full max-w-xs">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{['','距离','时长','热量'][goalType==='DISTANCE'?1:goalType==='DURATION'?2:3]}目标</span>
            <span>{goalType==='DISTANCE'?`${(meters/1000).toFixed(2)}/${(goalValue/1000).toFixed(1)}km`
                  :goalType==='DURATION'?`${fmtDuration(sec)}/${fmtDuration(goalValue)}`
                  :`${Math.round(meters*0.062)}/${goalValue}kcal`}</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${goalPct>=100?'bg-emerald-400':'bg-orange-400'}`} style={{width:`${goalPct}%`}} />
          </div>
          {goalPct>=100 && <div className="text-xs text-emerald-400 mt-1">🎯 目标达成！</div>}
        </div>
      )}

      {runMode==='outdoor' && isNative && (
        <div className="mt-2 text-xs text-slate-500">GPS {nativeGpsPoints}有效/{nativeRejectedPts}无效 · 精度{gpsAccuracy!=null?gpsAccuracy.toFixed(0)+'m':'--'}</div>
      )}
    </div>

    {/* 操作 */}
    <div className="px-8 pb-10 flex gap-4">
      {phase==='running' ? (
        <button onClick={togglePause} className="flex-1 py-4 rounded-full bg-amber-500 text-lg font-bold">暂停</button>
      ) : (
        <><button onClick={togglePause} className="flex-1 py-4 rounded-full bg-emerald-500 text-lg font-bold">继续</button>
        {runMode==='indoor' && (
          <div className="flex-1 flex items-center">
            <input value={indoorDistance} onChange={e=>setIndoorDistance(e.target.value.replace(/[^\d.]/g,''))}
              placeholder="距离(km)" className="w-full px-3 py-4 rounded-full bg-white/10 text-white text-sm text-center outline-none placeholder:text-slate-500" />
          </div>
        )}</>
      )}
      <button onClick={finish} className={`py-4 rounded-full bg-white/15 text-lg font-bold ${runMode==='indoor'?'px-4':'flex-1'}`}>结束</button>
    </div>
    {debugPanel}
  </div>);
}

function Row({k,v}:{k:string;v:string}) {
  return <div className="flex justify-between"><span className="text-slate-400 text-sm">{k}</span><span className="font-bold tabular-nums">{v}</span></div>;
}
