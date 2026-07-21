// ============================================================
// E23跑起来 · 跑步页（原生GPS前台Service集成版）
// Android原生APP时：通过GpsRun Capacitor插件调用Foreground Service
// 浏览器时：降级为演示模式，显示受限提示
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { store, fmtPace, fmtDuration } from '../lib/store';
import { isApiEnabled } from '../api/client';
import { uploadActivity } from '../api/sync';
import GpsRun from '../providers/nativeGpsPlugin';

type Phase = 'idle' | 'countdown' | 'running' | 'paused' | 'done' | 'manual' | 'recover';

const RUN_STATE_RUNNING = 1;
const RUN_STATE_PAUSED = 2;

function newClientId() {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function RunPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [sec, setSec] = useState(0);
  const [meters, setMeters] = useState(0);
  const [isNative, setIsNative] = useState(false);
  const [countdownN, setCountdownN] = useState(3);
  const [syncMsg, setSyncMsg] = useState('');

  // 恢复相关
  const [recoverId, setRecoverId] = useState('');
  const [recoverDistanceM, setRecoverDistanceM] = useState(0);
  const [recoverStartMs, setRecoverStartMs] = useState(0);

  // 跑步状态
  const [gpsOK, setGpsOK] = useState<boolean | null>(null);
  // @ts-ignore
  const [gpsMsg, setGpsMsg] = useState('');
  // @ts-ignore
  const [permissionTip, setPermissionTip] = useState('');
  // @ts-ignore
  const [batteryTip, setBatteryTip] = useState(false);

  // 原生GPS统计
  const [nativeDistanceM, setNativeDistanceM] = useState(0);
  const [nativeDurationMs, setNativeDurationMs] = useState(0);
  const [nativeGpsPoints, setNativeGpsPoints] = useState(0);
  const [nativeRejectedPts, setNativeRejectedPts] = useState(0);

  // 手动补录表单
  const [mDate, setMDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mKm, setMKm] = useState('');
  const [mMin, setMMin] = useState('');

  const geoTrail = useRef<Array<{ lat: number; lon: number; accuracyM: number | null; timestamp: string }>>([]);
  const startTs = useRef<number>(0);
  const nativeClientId = useRef<string>('');

  // 检测是否原生环境
  useEffect(() => {
    const native = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GpsRun');
    setIsNative(native);
  }, []);

  // ===== 异常恢复：检查未完成的跑步 =====
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

  // ===== 原生GPS事件监听 =====
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('GpsRun')) return;

    // @ts-ignore - Capacitor event listeners
    const h2 = (window as any).Capacitor?.Plugins?.GpsRun?.addListener?.('statsUpdate', (data: any) => {
      if (!data || data.type !== 'stats') return;
      setNativeDistanceM(data.distanceM || 0);
      setNativeDurationMs(data.durationMs || 0);
      setNativeGpsPoints(data.gpsPoints || 0);
      setNativeRejectedPts(data.rejectedPts || data.rejectedPoints || 0);
    });

    // @ts-ignore
    const h3 = (window as any).Capacitor?.Plugins?.GpsRun?.addListener?.('serviceStateChange', (data: any) => {
      if (!data) return;
      if (data.state === RUN_STATE_RUNNING) {
        setGpsOK(true);
        setGpsMsg('');
      } else if (data.state === RUN_STATE_PAUSED) {
        setGpsMsg('已暂停');
      } else {
        setGpsOK(false);
        setGpsMsg(data.message || '');
      }
    });

    // @ts-ignore
    const h4 = (window as any).Capacitor?.Plugins?.GpsRun?.addListener?.('activeRunDetected', (data: any) => {
      if (data && data.activeRun && data.clientActivityId) {
        setRecoverId(data.clientActivityId);
        setRecoverDistanceM(data.totalDistanceM || 0);
        setRecoverStartMs(data.startTimeMs || 0);
        setPhase('recover');
      }
    });

    return () => { h2?.(); h3?.(); h4?.(); };
  }, []);

  // ===== 计时（模拟模式 + 原生GPS回退） =====
  useEffect(() => {
    if (phase !== 'running') return;

    const iv = setInterval(() => {
      if (isNative && Capacitor.isPluginAvailable('GpsRun')) {
        GpsRun.getCurrentStats().then((s) => {
          if (s.state === RUN_STATE_RUNNING) {
            setNativeDistanceM(s.distanceM || 0);
            setNativeDurationMs(s.durationMs || 0);
            setMeters(s.distanceM || 0);
            setSec(Math.round((s.durationMs || 0) / 1000));
            setNativeGpsPoints(s.gpsPoints || 0);
            setNativeRejectedPts(s.rejectedPts || s.rejectedPoints || 0);
          }
        }).catch(() => {});
      } else {
        setSec((s) => s + 1);
        setMeters((m) => m + 1000 / 345);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, isNative]);

  const km = meters / 1000;
  const avgPace = km > 0.01 ? sec / km : 0;
  const kcal = Math.round(km * 62);

  // ===== 倒计时 =====
  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdownN(3);
    const iv = setInterval(() => {
      setCountdownN((n) => {
        if (n <= 1) {
          clearInterval(iv);
          doStartRun();
          return 0;
        }
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
    setNativeDurationMs(0);
    setNativeGpsPoints(0);
    setNativeRejectedPts(0);

    if (isNative && Capacitor.isPluginAvailable('GpsRun')) {
      try {
        await GpsRun.startRun();
        setPhase('running');
      } catch {
        setGpsOK(false);
        setGpsMsg('原生GPS启动失败，请检查定位权限');
        setPhase('idle');
      }
    } else {
      setPhase('running');
    }
  };

  const togglePause = async () => {
    if (phase === 'running') {
      if (isNative && Capacitor.isPluginAvailable('GpsRun')) {
        try { await GpsRun.pauseRun(); } catch {}
      }
      setPhase('paused');
    } else if (phase === 'paused') {
      if (isNative && Capacitor.isPluginAvailable('GpsRun')) {
        try { await GpsRun.resumeRun(); } catch {}
      }
      setPhase('running');
    }
  };

  const finish = async () => {
    if (isNative && Capacitor.isPluginAvailable('GpsRun')) {
      try { await GpsRun.stopRun(); } catch {}
    }

    const finalKm = km;
    if (finalKm >= 0.05) {
      const startedAt = startTs.current || Date.now() - sec * 1000;
      store.addRecord({
        id: nativeClientId.current || newClientId(),
        ts: Date.now(),
        km: Math.round(finalKm * 100) / 100,
        durationSec: sec,
        avgPaceSec: Math.round(avgPace),
        source: isNative ? 'gps' : 'sim',
        startedAt,
        syncState: 'local',
      });

      if (isApiEnabled() && store.user?.authMode === 'server') {
        uploadActivity({
          clientId: nativeClientId.current || newClientId(),
          source: 'gps',
          distanceM: Math.round(finalKm * 1000),
          durationSec: sec,
          startedAt: new Date(startedAt).toISOString(),
          endedAt: new Date().toISOString(),
          trackPoints: geoTrail.current.slice(0, 50000),
        }).then((r) => {
          store.updateRecordSync(nativeClientId.current, r === 'ok' ? 'ok' : r === 'rejected' ? 'rejected' : 'queued');
          setSyncMsg(r === 'ok' ? '✅ 已上传服务器并完成校验' : r === 'rejected' ? '❌ 服务端校验未通过' : '📥 已存入待同步队列');
        });
      } else {
        setSyncMsg('本机模式：记录已保存在本机');
      }
    }
    setPhase('done');
  };

  // ===== 恢复处理 =====
  const recoverResume = async () => {
    geoTrail.current = [];
    startTs.current = recoverStartMs;
    nativeClientId.current = recoverId;
    setPhase('running');
    if (isNative && Capacitor.isPluginAvailable('GpsRun')) {
      try { await GpsRun.resumeRun(); } catch {}
    }
  };

  const recoverFinish = async () => {
    if (isNative && Capacitor.isPluginAvailable('GpsRun')) {
      try { await GpsRun.stopRun(); } catch {}
    }
    const finalKm = recoverDistanceM / 1000;
    if (finalKm >= 0.05) {
      store.addRecord({
        id: recoverId,
        ts: Date.now(),
        km: Math.round(finalKm * 100) / 100,
        durationSec: Math.round((Date.now() - recoverStartMs) / 1000),
        avgPaceSec: 0,
        source: 'gps',
        startedAt: recoverStartMs || Date.now(),
        syncState: 'local',
      });
    }
    setPhase('done');
  };

  const recoverDiscard = () => setPhase('idle');

  const saveManual = () => {
    const km = parseFloat(mKm);
    const min = parseFloat(mMin);
    if (!km || km <= 0 || !min || min <= 0) return;
    const ts = new Date(`${mDate}T12:00:00`).getTime();
    const start = isNaN(ts) ? Date.now() - Math.round(min * 60) * 1000 : ts - Math.round(min * 60) * 1000;
    const id = newClientId();
    store.addRecord({
      id, ts: isNaN(ts) ? Date.now() : ts,
      km: Math.round(km * 100) / 100, durationSec: Math.round(min * 60),
      avgPaceSec: Math.round((min * 60) / km), source: 'manual',
      startedAt: start, syncState: 'local',
    });
    if (isApiEnabled() && store.user?.authMode === 'server') {
      uploadActivity({
        clientId: id,
        source: 'manual',
        distanceM: Math.round(km * 1000),
        durationSec: Math.round(min * 60),
        startedAt: new Date(start).toISOString(),
        endedAt: new Date(start + Math.round(min * 60) * 1000).toISOString(),
        evidenceNote: 'App手动补录',
      }).then((r) => {
        store.updateRecordSync(id, r === 'ok' ? 'ok' : r === 'rejected' ? 'rejected' : 'queued');
        setSyncMsg(r === 'ok' ? '✅ 已提交，待管理员审核' : '📥 已存入待同步队列');
      });
    } else {
      setSyncMsg('本机模式：记录已保存在本机');
    }
    setMKm(''); setMMin('');
    setPhase('done');
  };

  // ===== 恢复页面 =====
  if (phase === 'recover') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white px-8">
        <div className="text-5xl mb-3">📋</div>
        <div className="text-xl font-bold mb-1">发现未完成跑步</div>
        <div className="text-sm text-slate-400 mb-6 text-center">
          上次跑步在 {(recoverStartMs > 0 ? new Date(recoverStartMs).toLocaleString('zh-CN') : '')} 尚未结束<br />
          已跑 {(recoverDistanceM / 1000).toFixed(2)} 公里
        </div>
        <div className="w-full max-w-xs space-y-3">
          <button onClick={recoverResume} className="w-full py-4 rounded-full bg-emerald-500 font-bold active:bg-emerald-600 text-lg">继续跑步</button>
          <button onClick={recoverFinish} className="w-full py-4 rounded-full bg-orange-500 font-bold active:bg-orange-600 text-lg">结束并保存</button>
          <button onClick={recoverDiscard} className="w-full py-4 rounded-full bg-white/15 font-bold active:bg-white/25">放弃（保留审计记录）</button>
          <div className="text-[10px] text-slate-500 text-center mt-2">放弃操作不会删除数据</div>
        </div>
      </div>
    );
  }

  // ===== 手动补录 =====
  if (phase === 'manual') {
    return (
      <div className="h-full flex flex-col bg-slate-900 text-white px-8 pt-10">
        <div className="text-xl font-bold mb-1">手动补录</div>
        <div className="text-xs text-slate-400 mb-6">补记真实发生的跑步，1:1 计入环线</div>
        <label className="text-xs text-slate-400 mb-1">日期</label>
        <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)}
          className="mb-4 px-4 py-3 rounded-xl bg-white/10 text-white outline-none" />
        <label className="text-xs text-slate-400 mb-1">距离（公里）</label>
        <input value={mKm} onChange={(e) => setMKm(e.target.value.replace(/[^\d.]/g, ''))} placeholder="如 5.2" inputMode="decimal"
          className="mb-4 px-4 py-3 rounded-xl bg-white/10 text-white outline-none placeholder:text-slate-500" />
        <label className="text-xs text-slate-400 mb-1">时长（分钟）</label>
        <input value={mMin} onChange={(e) => setMMin(e.target.value.replace(/[^\d.]/g, ''))} placeholder="如 30" inputMode="decimal"
          className="mb-2 px-4 py-3 rounded-xl bg-white/10 text-white outline-none placeholder:text-slate-500" />
        {mKm && mMin && parseFloat(mKm) > 0 && (
          <div className="text-xs text-slate-400 mb-4">平均配速约 {fmtPace((parseFloat(mMin) * 60) / parseFloat(mKm))}/km</div>
        )}
        <div className="flex gap-3 mt-4">
          <button onClick={() => setPhase('idle')} className="flex-1 py-3.5 rounded-full bg-white/15 font-bold">取消</button>
          <button onClick={saveManual} className="flex-1 py-3.5 rounded-full bg-orange-500 font-bold active:bg-orange-600">保存</button>
        </div>
      </div>
    );
  }

  // ===== 跑后页面 =====
  if (phase === 'done') {
    return (
      <div className="h-full flex flex-col bg-slate-900 text-white overflow-y-auto">
        <div className="text-center pt-8 pb-4">
          <div className="text-5xl mb-3">🎉</div>
          <div className="text-xl font-bold mb-1">本次跑步完成</div>
          <div className="text-sm text-slate-400">已 1:1 同步到中国地图环线</div>
        </div>
        <div className="bg-white/10 rounded-2xl mx-5 p-5 space-y-3">
          <Row k="总距离" v={`${km.toFixed(2)} km`} />
          <Row k="总时长" v={fmtDuration(sec)} />
          <Row k="平均配速" v={fmtPace(avgPace)} />
          <Row k="消耗" v={`${kcal} 千卡`} />
          {isNative && (
            <>
              <Row k="GPS有效点数" v={String(nativeGpsPoints)} />
              <Row k="无效点数" v={String(nativeRejectedPts)} />
              <Row k="数据来源" v="E23 GPS（前台服务）" />
            </>
          )}
        </div>
        {!isNative && (
          <div className="mx-5 mt-3 text-[10px] text-amber-400/70 text-center">
            ⚠️ 浏览器模式数据仅供参考，不支持真实GPS跑步
          </div>
        )}
        {syncMsg && <div className="mt-3 mx-5 text-xs text-slate-300 text-center">{syncMsg}</div>}
        <div className="flex-1" />
        <div className="px-5 pb-6">
          <button onClick={() => setPhase('idle')} className="w-full py-4 rounded-full bg-orange-500 font-bold active:bg-orange-600 text-lg">返回</button>
        </div>
      </div>
    );
  }

  // ===== 跑前准备 =====
  if (phase === 'idle') {
    return (
      <div className="h-full flex flex-col bg-slate-900 text-white">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-40 h-40 rounded-full border-4 border-orange-500/40 flex items-center justify-center mb-6">
            <div className="w-32 h-32 rounded-full bg-orange-500 flex items-center justify-center text-4xl">{isNative ? '🏃' : '📱'}</div>
          </div>
          <div className="text-slate-400 text-sm mb-1">
            {isNative ? '准备好就跑起来，每一步都算数' : '浏览器模式 · 仅前台演示'}
          </div>
          <div className="text-xs text-slate-500 mb-6">
            {isNative ? '前台Service · 锁屏/后台持续定位 · 常驻通知' : '不支持可靠锁屏后台跑步，请安装Android APK'}
          </div>

          {isNative && (
            <div className="w-full max-w-xs space-y-2 mb-4">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/50 border border-slate-700">
                <span className={`w-2 h-2 rounded-full ${gpsOK === null ? 'bg-yellow-400 animate-pulse' : gpsOK ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-xs text-slate-300">{gpsOK === null ? 'GPS 待检测' : gpsOK ? 'GPS 正常' : 'GPS 信号弱或权限未开启'}</span>
              </div>
              {permissionTip && (
                <div className="text-xs text-amber-300 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30">⚠️ {permissionTip}</div>
              )}
              {batteryTip && (
                <div className="text-xs text-slate-400 px-4 py-2 rounded-2xl bg-slate-800 border border-slate-700">
                  💡 建议关闭电池优化：系统设置 → 应用 → E23跑起来 → 电池 → 无限制
                </div>
              )}
            </div>
          )}

          {isNative && (
            <div className="w-full max-w-xs mb-3 text-[10px] text-slate-500 leading-relaxed px-4 py-2 rounded-2xl bg-slate-800/30">
              💡 华为/小米/OPPO/vivo 在锁屏或后台可能限制定位。请将E23跑起来设置为「无限制」电池策略，并开启「后台定位」。
            </div>
          )}

          <button onClick={() => setPhase('countdown')}
            className="w-full max-w-xs py-4 rounded-full bg-orange-500 text-lg font-black tracking-widest active:bg-orange-600 shadow-lg shadow-orange-500/30">
            开始跑步
          </button>
          <button onClick={() => setPhase('manual')} className="mt-3 text-sm text-slate-400 underline underline-offset-4">手动补录一次跑步</button>
        </div>
        <div className="px-6 pb-6 text-center text-xs text-slate-600">
          数据来源：{isNative ? 'E23原生GPS（前台Service）' : '浏览器演示模式'}
        </div>
      </div>
    );
  }

  // ===== 倒计时页面 =====
  if (phase === 'countdown') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="text-9xl font-black text-orange-500 animate-bounce">
          {countdownN > 0 ? countdownN : 'GO!'}
        </div>
        <div className="mt-8 text-slate-400 text-sm">{countdownN > 0 ? `${countdownN}秒后开始` : '跑起来！'}</div>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />正在获取GPS信号 ...
        </div>
      </div>
    );
  }

  // ===== 跑中页面 =====
  const isPaused = phase === 'paused';
  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-400' : gpsOK === false ? 'bg-red-400' : 'bg-emerald-400'} ${!isPaused ? 'animate-pulse' : ''}`} />
          <span className="text-xs text-slate-400">{isPaused ? '已暂停' : gpsOK === false ? 'GPS信号弱' : isNative ? 'GPS定位中' : '模拟模式'}</span>
        </div>
        <div className="text-xs text-slate-500">{isNative ? '原生GPS' : '浏览器'}</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-7xl font-black tabular-nums tracking-tight">{(isNative && nativeDistanceM > 0 ? nativeDistanceM / 1000 : km).toFixed(2)}</div>
        <div className="text-slate-400 mt-1">公里</div>
        <div className="mt-6 grid grid-cols-3 gap-6 text-center">
          <div><div className="text-2xl font-bold tabular-nums">{fmtPace(avgPace)}</div><div className="text-xs text-slate-500 mt-0.5">平均配速</div></div>
          <div><div className="text-2xl font-bold tabular-nums">{fmtDuration(isNative ? Math.round(nativeDurationMs / 1000) : sec)}</div><div className="text-xs text-slate-500 mt-0.5">时长</div></div>
          <div><div className="text-2xl font-bold tabular-nums">{kcal}</div><div className="text-xs text-slate-500 mt-0.5">千卡</div></div>
        </div>
        {isNative && <div className="mt-4 text-xs text-slate-500">有效GPS点 {nativeGpsPoints} · 无效 {nativeRejectedPts}</div>}
        <div className="mt-6 text-sm text-slate-400">为班级环线 +{(isNative ? nativeDistanceM / 1000 : km).toFixed(2)} km</div>
      </div>

      <div className="px-8 pb-10 flex gap-4">
        {phase === 'running' ? (
          <button onClick={togglePause} className="flex-1 py-4 rounded-full bg-amber-500 text-lg font-bold active:bg-amber-600">暂停</button>
        ) : (
          <button onClick={togglePause} className="flex-1 py-4 rounded-full bg-emerald-500 text-lg font-bold active:bg-emerald-600">继续</button>
        )}
        <button onClick={finish} className="flex-1 py-4 rounded-full bg-white/15 text-lg font-bold active:bg-white/25">结束</button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-slate-400 text-sm">{k}</span><span className="font-bold tabular-nums">{v}</span></div>;
}
