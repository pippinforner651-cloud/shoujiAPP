import { useEffect, useRef, useState } from 'react';
import { store, fmtPace, fmtDuration } from '../lib/store';
import { isApiEnabled } from '../api/client';
import { uploadActivity } from '../api/sync';
import { pickGpsProvider } from '../providers';
import type { TrackPointPayload } from '../api/types';

type Phase = 'idle' | 'running' | 'paused' | 'done' | 'manual';

function newClientId() {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function RunPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<'gps' | 'sim'>('gps');
  const [sec, setSec] = useState(0);
  const [meters, setMeters] = useState(0);
  const [curPace, setCurPace] = useState(0); // 秒/km
  const [gpsOK, setGpsOK] = useState<boolean | null>(null);
  const [gpsMsg, setGpsMsg] = useState('');
  // 手动补录表单
  const [mDate, setMDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mKm, setMKm] = useState('');
  const [mMin, setMMin] = useState('');

  const lastFix = useRef<{ coord: [number, number]; t: number } | null>(null);
  const trail = useRef<Array<{ t: number; m: number }>>([]);
  const geoTrail = useRef<TrackPointPayload[]>([]); // 原始GPS轨迹（上传后端用）
  const startTs = useRef<number>(0);
  const [syncMsg, setSyncMsg] = useState('');

  // 计时
  useEffect(() => {
    if (phase !== 'running') return;
    const iv = setInterval(() => {
      setSec((s) => s + 1);
      if (mode === 'sim') {
        // 模拟：约 5'30"~6'30"/km 的步频波动
        const pace = 345 + Math.sin(Date.now() / 3000) * 25;
        setMeters((m) => {
          const nm = m + 1000 / pace;
          trail.current.push({ t: Date.now(), m: nm });
          return nm;
        });
        setCurPace(pace);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, mode]);

  // GPS：经适配器层（原生容器=android-gps，浏览器=web-gps）
  useEffect(() => {
    if (phase !== 'running' || mode !== 'gps') return;
    let alive = true;
    let stopFn: (() => void) | undefined;
    queueMicrotask(() => {
      if (!alive) return;
      const provider = pickGpsProvider();
      if (!provider.isAvailable() || !provider.start) {
        setGpsOK(false);
        setGpsMsg('当前环境不支持定位，请改用「室内/演示」模式');
        setMode('sim');
        return;
      }
      provider.start(
      (fix) => {
        setGpsOK(true);
        setGpsMsg('');
        const coord: [number, number] = [fix.lon, fix.lat];
        const now = fix.timestamp;
        geoTrail.current.push({ lon: fix.lon, lat: fix.lat, accuracyM: fix.accuracyM, timestamp: new Date(now).toISOString() });
        if (lastFix.current) {
          const d = haversine(lastFix.current.coord, coord);
          if (d > 0.5 && d < 100) {
            setMeters((m) => {
              const nm = m + d;
              trail.current.push({ t: now, m: nm });
              return nm;
            });
          }
        }
        lastFix.current = { coord, t: now };
      },
      (msg) => {
        // 权限被拒绝/不可用时给出明确提示，不静默降级
        setGpsOK(false);
        setGpsMsg(`${msg}，或改用「室内/演示」模式`);
        setMode('sim');
      },
      );
      stopFn = () => provider.stop?.();
    });
    return () => { alive = false; stopFn?.(); };
  }, [phase, mode]);

  // 实时配速：最近 20 秒
  useEffect(() => {
    if (mode !== 'gps' || phase !== 'running') return;
    const iv = setInterval(() => {
      const now = Date.now();
      trail.current = trail.current.filter((p) => now - p.t < 60000);
      const win = trail.current.filter((p) => now - p.t <= 20000);
      if (win.length > 1) {
        const dm = win[win.length - 1].m - win[0].m;
        const dt = (win[win.length - 1].t - win[0].t) / 1000;
        if (dm > 1 && dt > 2) setCurPace((dt / dm) * 1000);
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [phase, mode]);

  const km = meters / 1000;
  const avgPace = km > 0.01 ? sec / km : 0;
  const kcal = Math.round(km * 62);

  const start = () => {
    trail.current = []; lastFix.current = null; geoTrail.current = [];
    startTs.current = Date.now();
    setSyncMsg('');
    setSec(0); setMeters(0); setCurPace(0);
    setPhase('running');
  };
  const finish = () => {
    if (km >= 0.05) {
      const id = newClientId();
      const startedAt = startTs.current || Date.now() - sec * 1000;
      store.addRecord({
        id, ts: Date.now(), km: Math.round(km * 100) / 100,
        durationSec: sec, avgPaceSec: Math.round(avgPace), source: mode,
        startedAt, syncState: 'local',
      });
      // 后端已接入时自动上传；离线则进入待同步队列
      if (isApiEnabled() && store.user?.authMode === 'server') {
        const distM = Math.round(km * 1000);
        uploadActivity({
          clientId: id,
          source: 'gps',
          distanceM: distM,
          durationSec: sec,
          startedAt: new Date(startedAt).toISOString(),
          endedAt: new Date().toISOString(),
          trackPoints: geoTrail.current.slice(0, 50000),
        }).then((r) => {
          store.updateRecordSync(id, r === 'ok' ? 'ok' : r === 'rejected' ? 'rejected' : 'queued');
          setSyncMsg(r === 'ok' ? '✅ 已上传服务器并完成校验' : r === 'rejected' ? '❌ 服务端校验未通过（详见我的记录）' : '📥 已存入待同步队列（离线或待审批）');
        });
      } else {
        setSyncMsg('本机模式：记录已保存在本机（未连接班级后端）');
      }
    }
    setPhase('done');
  };

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
        setSyncMsg(r === 'ok' ? '✅ 已提交，手动补录待管理员审核后计入' : '📥 已存入待同步队列（离线或待审批）');
      });
    } else {
      setSyncMsg('本机模式：记录已保存在本机（未连接班级后端）');
    }
    setMKm(''); setMMin('');
    setPhase('done');
  };

  if (phase === 'manual') {
    return (
      <div className="h-full flex flex-col bg-slate-900 text-white px-8 pt-10">
        <div className="text-xl font-bold mb-1">手动补录</div>
        <div className="text-xs text-slate-400 mb-6">补记真实发生的跑步（跑步机、忘记开表等），1:1 计入环线</div>
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

  if (phase === 'done') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white px-8">
        <div className="text-5xl mb-3">🎉</div>
        <div className="text-xl font-bold mb-1">本次跑步完成</div>
        <div className="text-sm text-slate-400 mb-6">已 1:1 同步到中国地图环线</div>
        <div className="w-full max-w-xs bg-white/10 rounded-2xl p-5 space-y-3">
          <Row k="距离" v={`${km.toFixed(2)} km`} />
          <Row k="时长" v={fmtDuration(sec)} />
          <Row k="平均配速" v={fmtPace(avgPace)} />
          <Row k="消耗" v={`${kcal} 千卡`} />
        </div>
        {syncMsg && <div className="mt-3 text-xs text-slate-300 text-center max-w-xs">{syncMsg}</div>}
        <button onClick={() => setPhase('idle')} className="mt-8 w-full max-w-xs py-3.5 rounded-full bg-orange-500 font-bold active:bg-orange-600">返回</button>
      </div>
    );
  }

  if (phase === 'idle') {
    return (
      <div className="h-full flex flex-col bg-slate-900 text-white">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-40 h-40 rounded-full border-4 border-orange-500/40 flex items-center justify-center mb-8">
            <div className="w-32 h-32 rounded-full bg-orange-500 flex items-center justify-center text-4xl">🏃</div>
          </div>
          <div className="text-slate-400 text-sm mb-1">准备好就跑起来，每一步都算数</div>
          <div className="text-xs text-slate-500 mb-8">实时显示配速 · 距离 · 时长，1:1 点亮中国地图</div>
          <div className="flex gap-3 mb-4">
            <ModeBtn active={mode === 'gps'} onClick={() => setMode('gps')} label="GPS 户外跑" sub="前台实时定位" />
            <ModeBtn active={mode === 'sim'} onClick={() => setMode('sim')} label="室内/演示" sub="模拟配速" />
          </div>
          {gpsMsg && (
            <div className="w-full max-w-xs mb-4 text-xs leading-relaxed px-4 py-3 rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              ⚠️ {gpsMsg}
            </div>
          )}
          <button onClick={start} className="w-full max-w-xs py-4 rounded-full bg-orange-500 text-lg font-black tracking-widest active:bg-orange-600 shadow-lg shadow-orange-500/30">
            开始跑步
          </button>
          <button onClick={() => setPhase('manual')} className="mt-3 text-sm text-slate-400 underline underline-offset-4">手动补录一次跑步</button>
        </div>
        <div className="px-6 pb-6 text-center text-xs text-slate-600">
          数据来源：{mode === 'gps' ? '手机 GPS（仅前台，锁屏后台GPS未实现）' : '模拟配速'} · 心率/步频/海拔/手表同步尚未实现
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      <div className="pt-6 text-center text-xs text-slate-400">{mode === 'gps' ? (gpsOK === false ? 'GPS 信号弱' : 'GPS 定位中') : '模拟模式'} · {phase === 'paused' ? '已暂停' : '跑步中'}</div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-7xl font-black tabular-nums tracking-tight">{km.toFixed(2)}</div>
        <div className="text-slate-400 mt-1">公里</div>
        <div className="mt-8 grid grid-cols-3 gap-6 text-center">
          <div><div className="text-2xl font-bold tabular-nums">{fmtPace(curPace)}</div><div className="text-xs text-slate-500 mt-0.5">实时配速</div></div>
          <div><div className="text-2xl font-bold tabular-nums">{fmtPace(avgPace)}</div><div className="text-xs text-slate-500 mt-0.5">平均配速</div></div>
          <div><div className="text-2xl font-bold tabular-nums">{fmtDuration(sec)}</div><div className="text-xs text-slate-500 mt-0.5">时长</div></div>
        </div>
        <div className="mt-6 text-sm text-slate-400">{kcal} 千卡 · 为班级环线 +{km.toFixed(2)} km</div>
      </div>
      <div className="px-8 pb-10 flex gap-4">
        {phase === 'running' ? (
          <button onClick={() => setPhase('paused')} className="flex-1 py-4 rounded-full bg-amber-500 text-lg font-bold active:bg-amber-600">暂停</button>
        ) : (
          <button onClick={() => setPhase('running')} className="flex-1 py-4 rounded-full bg-emerald-500 text-lg font-bold active:bg-emerald-600">继续</button>
        )}
        <button onClick={finish} className="flex-1 py-4 rounded-full bg-white/15 text-lg font-bold active:bg-white/25">结束</button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-slate-400 text-sm">{k}</span><span className="font-bold tabular-nums">{v}</span></div>;
}

function ModeBtn({ active, onClick, label, sub }: { active: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button onClick={onClick} className={`px-4 py-2.5 rounded-2xl border text-left transition ${active ? 'border-orange-500 bg-orange-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
      <div className={`text-sm font-bold ${active ? 'text-orange-400' : 'text-slate-300'}`}>{label}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </button>
  );
}
