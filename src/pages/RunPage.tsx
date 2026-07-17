import { useEffect, useRef, useState } from 'react';
import { store, fmtPace, fmtDuration } from '../lib/store';

type Phase = 'idle' | 'running' | 'paused' | 'done';

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

  const lastFix = useRef<{ coord: [number, number]; t: number } | null>(null);
  const trail = useRef<Array<{ t: number; m: number }>>([]);
  const watchId = useRef<number | null>(null);

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

  // GPS
  useEffect(() => {
    if (phase !== 'running' || mode !== 'gps' || !('geolocation' in navigator)) return;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setGpsOK(true);
        if (p.coords.accuracy > 40) return; // 过滤漂移
        const fix: [number, number] = [p.coords.longitude, p.coords.latitude];
        const now = Date.now();
        if (lastFix.current) {
          const d = haversine(lastFix.current.coord, fix);
          if (d > 0.5 && d < 100) {
            setMeters((m) => {
              const nm = m + d;
              trail.current.push({ t: now, m: nm });
              return nm;
            });
          }
        }
        lastFix.current = { coord: fix, t: now };
      },
      () => { setGpsOK(false); setMode('sim'); },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 }
    );
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); };
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
    trail.current = []; lastFix.current = null;
    setSec(0); setMeters(0); setCurPace(0);
    setPhase('running');
  };
  const finish = () => {
    if (km >= 0.05) {
      store.addRecord({
        id: `r${Date.now()}`, ts: Date.now(), km: Math.round(km * 100) / 100,
        durationSec: sec, avgPaceSec: Math.round(avgPace), source: mode,
      });
    }
    setPhase('done');
  };

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
          <div className="flex gap-3 mb-8">
            <ModeBtn active={mode === 'gps'} onClick={() => setMode('gps')} label="GPS 户外跑" sub={gpsOK === false ? '定位不可用' : '实时定位'} />
            <ModeBtn active={mode === 'sim'} onClick={() => setMode('sim')} label="室内/演示" sub="模拟配速" />
          </div>
          <button onClick={start} className="w-full max-w-xs py-4 rounded-full bg-orange-500 text-lg font-black tracking-widest active:bg-orange-600 shadow-lg shadow-orange-500/30">
            开始跑步
          </button>
        </div>
        <div className="px-6 pb-6 text-center text-xs text-slate-600">数据来源：{mode === 'gps' ? '手机 GPS（浏览器定位）' : '模拟配速'} · 悦跑圈/手表同步接口已预留</div>
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
