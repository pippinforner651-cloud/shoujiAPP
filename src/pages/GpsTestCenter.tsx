// ============================================================
// E23跑起来 · 手机GPS测试中心
// 完全与跑步页面解耦的三层诊断：
//   测试1：定位环境检查
//   测试2：单次原生GPS定位
//   测试3：60秒持续原生定位
// 不创建活动、不启动距离累计、不经过跑步状态机
// ============================================================
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import GpsRun from '../providers/nativeGpsPlugin';
import type { DiagnosticsResponse, SingleFixResponse } from '../providers/nativeGpsPlugin';

export default function GpsTestCenter({ onBack }: { onBack?: () => void }) {
  const isNative = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GpsRun');

  // 环境检查
  const [env, setEnv] = useState<DiagnosticsResponse | null>(null);
  const [envDone, setEnvDone] = useState(false);
  const [envCopyMsg, setEnvCopyMsg] = useState('');

  // 单次定位
  const [singleFixState, setSingleFixState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [singleFixResult, setSingleFixResult] = useState<SingleFixResponse | null>(null);
  const [singleFixError, setSingleFixError] = useState('');
  const [singleFixTimer, setSingleFixTimer] = useState(0);

  // 持续定位
  const [trackState, setTrackState] = useState<'idle' | 'running'>('idle');
  const [trackSeconds, setTrackSeconds] = useState(0);
  const [trackPoints, setTrackPoints] = useState(0);
  const [trackLog, setTrackLog] = useState<string[]>([]);

  const runEnvCheck = async () => {
    if (!isNative) return;
    try {
      const d = await GpsRun.getDiagnostics();
      setEnv(d);
      setEnvDone(true);
    } catch {}
  };

  const copyEnv = () => {
    if (!env) return;
    const t = `手机: ${env.phoneBrand} ${env.phoneModel}
Android: ${env.androidVersion} (SDK ${env.sdkVersion})
插件加载: ${env.pluginLoaded}
精确定位: ${env.fineLocationGranted}
大概位置: ${env.coarseLocationGranted}
定位模式: ${env.locationPermission}
系统定位: ${env.systemLocationEnabled}
GPS: ${env.gpsEnabled}
NETWORK: ${env.networkEnabled}
通知权限: ${env.notificationPermissionGranted}
前台服务: ${env.foregroundServicePermissionGranted}
Service运行: ${env.serviceRunning}
GPS请求成功: ${env.locationRequestSucceeded}
GPS回调: ${env.gpsCallbackCount}
NET回调: ${env.networkCallbackCount}
首点已获: ${env.firstFixReceived}
最后provider: ${env.lastCallbackProvider}
最后精度: ${env.lastAccuracy}
有效点: ${env.validPoints}
拒绝点: ${env.rejectedPoints}
拒绝原因: ${env.lastRejectReason}
SQLite写入: ${env.sqliteWriteOk}
原生距离: ${env.totalDistanceM}m`;
    navigator.clipboard.writeText(t).then(() => { setEnvCopyMsg('已复制'); setTimeout(() => setEnvCopyMsg(''), 2000); }).catch(() => {});
  };

  const requestSingleFix = async () => {
    setSingleFixState('running');
    setSingleFixError('');
    setSingleFixResult(null);
    setSingleFixTimer(0);
    const timerIv = window.setInterval(() => setSingleFixTimer(t => t + 1), 1000);
    try {
      const result = await GpsRun.requestSingleFix();
      setSingleFixResult(result);
      setSingleFixState('done');
      addTrackLog(`单次定位完成: ${result.success ? '成功' : '失败'} provider=${result.provider} acc=${result.accuracy}m`);
    } catch (e) {
      setSingleFixError(e instanceof Error ? e.message : String(e));
      setSingleFixState('error');
      addTrackLog(`单次定位失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      window.clearInterval(timerIv);
    }
  };

  const startTracking = async () => {
    if (!isNative) return;
    setTrackState('running');
    setTrackSeconds(0);
    setTrackPoints(0);
    setTrackLog([]);
    try {
      GpsRun.startDiagnosticTracking({ durationMs: 60000 });
      // Poll diagnostics every 2s
      const pollIv = window.setInterval(async () => {
        try {
          const d = await GpsRun.getDiagnostics();
          if (d.gpsCallbackCount !== undefined) setTrackPoints(d.gpsCallbackCount);
          const lastLoc = d.lastLocationCallbackMs ? new Date(d.lastLocationCallbackMs).toLocaleTimeString() : '从未';
          addTrackLog(`回调:${d.gpsCallbackCount} acc:${d.lastAccuracy?.toFixed(1) ?? '-'}m 最近:${lastLoc}`);
        } catch {}
      }, 2000);
      const secIv = window.setInterval(() => setTrackSeconds(s => {
        if (s >= 60) {
          window.clearInterval(pollIv);
          window.clearInterval(secIv);
          GpsRun.cancelDiagnosticTracking().catch(() => {});
          setTrackState('idle');
          return 60;
        }
        return s + 1;
      }), 1000);
      // Auto-stop at 60
    } catch (e) {
      addTrackLog(`追踪启动失败: ${e}`);
      setTrackState('idle');
    }
  };

  const addTrackLog = (msg: string) => setTrackLog(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  if (!isNative) {
    return (<div className="min-h-full bg-slate-950 text-white p-6">
      <h1 className="text-xl font-black mb-4">手机GPS测试中心</h1>
      <p className="text-slate-400">GPS测试需要Android原生环境。</p>
    </div>);
  }

  return (<div className="min-h-full bg-slate-950 text-white pb-24">
    <div className="px-5 pt-6 pb-3">
      {onBack && <button onClick={onBack} className="text-sm text-slate-400 mb-2">← 返回我的</button>}
      <h1 className="text-2xl font-black">手机GPS测试中心</h1>
      <p className="text-xs text-slate-500 mt-1">与跑步完全解耦 · 不创建活动 · 不累计距离</p>
    </div>
    <div className="px-4 space-y-6">

      {/* 测试1：定位环境检查 */}
      <section className="rounded-3xl bg-slate-900 p-5">
        <h2 className="text-lg font-bold flex items-center gap-2">📋 测试1：定位环境检查</h2>
        {!envDone ? (
          <button onClick={runEnvCheck} className="mt-3 w-full py-3 rounded-full bg-orange-500 font-bold">开始检查</button>
        ) : env ? (
          <div className="mt-3 space-y-1.5 text-xs">
            <Row label="手机" value={`${env.phoneBrand} ${env.phoneModel}`} />
            <Row label="Android" value={`${env.androidVersion} (SDK ${env.sdkVersion})`} />
            <Row label="原生插件" value={env.pluginLoaded ? '✅ 已加载' : '❌ 未加载'} alert={!env.pluginLoaded} />
            <Row label="精确定位" value={env.fineLocationGranted ? '✅ 已授权' : '❌ 未授权'} alert={!env.fineLocationGranted} />
            <Row label="定位模式" value={env.locationPermission === 'precise' ? '精确' : env.locationPermission === 'approximate' ? '大概' : '拒绝'} alert={env.locationPermission !== 'precise'} />
            <Row label="系统定位" value={env.systemLocationEnabled ? '✅ 开启' : '❌ 关闭'} alert={!env.systemLocationEnabled} />
            <Row label="GPS_PROVIDER" value={env.gpsEnabled ? '✅ 开启' : '❌ 关闭'} alert={!env.gpsEnabled} />
            <Row label="NETWORK" value={env.networkEnabled ? '开启' : '关闭'} />
            <Row label="通知权限" value={env.notificationPermissionGranted ? '已授权' : '未授权'} />
            <Row label="前台服务" value={env.foregroundServicePermissionGranted ? '已授权' : '未授权'} />
            <Row label="Service" value={env.serviceRunning ? '运行中' : '未运行'} />
            <Row label="最近错误" value={env.lastError || '无'} alert={!!env.lastError} />
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={copyEnv} className="px-3 py-1.5 rounded-full bg-slate-700 text-xs font-bold">{envCopyMsg || '📋 复制全部'}</button>
              <button onClick={async () => { try { const r = await GpsRun.exportDiagnosticLog(); navigator.clipboard.writeText(r.log); } catch {} }} className="px-3 py-1.5 rounded-full bg-slate-700 text-xs font-bold">📤 导出日志</button>
              <button onClick={() => { try { GpsRun.openAppLocationSettings(); } catch {} }} className="px-3 py-1.5 rounded-full bg-slate-700 text-xs font-bold">⚙️ 定位设置</button>
              <button onClick={() => { try { GpsRun.openSystemLocationSettings(); } catch {} }} className="px-3 py-1.5 rounded-full bg-slate-700 text-xs font-bold">📍 系统定位</button>
            </div>
          </div>
        ) : <p className="mt-3 text-xs text-red-400">检查失败</p>}
      </section>

      {/* 测试2：单次原生GPS定位 */}
      <section className="rounded-3xl bg-slate-900 p-5">
        <h2 className="text-lg font-bold flex items-center gap-2">📡 测试2：单次原生GPS定位</h2>
        <p className="text-xs text-slate-500 mt-1">调用Android原生单次定位接口，不创建活动。最长等待60秒。</p>
        {singleFixState === 'idle' ? (
          <button onClick={requestSingleFix} className="mt-3 w-full py-3 rounded-full bg-orange-500 font-bold">测试单次GPS定位</button>
        ) : singleFixState === 'running' ? (
          <div className="mt-4 text-center"><div className="text-amber-400 text-lg font-bold animate-pulse">定位中... {singleFixTimer}s</div></div>
        ) : singleFixState === 'done' && singleFixResult ? (
          <div className="mt-3 space-y-1.5 text-xs">
            <Row label="状态" value={singleFixResult.success ? '✅ 成功' : '❌ 失败'} alert={!singleFixResult.success} />
            <Row label="API" value={singleFixResult.api || '-'} />
            <Row label="耗时" value={`${singleFixResult.durationMs}ms`} />
            <Row label="Provider" value={singleFixResult.provider || '-'} />
            <Row label="纬度" value={String(singleFixResult.latitude)} />
            <Row label="经度" value={String(singleFixResult.longitude)} />
            <Row label="精度" value={singleFixResult.accuracy > 0 ? `${singleFixResult.accuracy.toFixed(1)}m` : '-'} />
            <Row label="海拔" value={singleFixResult.altitude > 0 ? `${singleFixResult.altitude.toFixed(0)}m` : '-'} />
            <Row label="速度" value={singleFixResult.speed > 0 ? `${singleFixResult.speed.toFixed(1)}m/s` : '-'} />
            <Row label="方位" value={singleFixResult.bearing > 0 ? `${singleFixResult.bearing.toFixed(0)}°` : '-'} />
            <Row label="来源" value={singleFixResult.mockLocation ? '⚠️ 模拟' : '真实'} alert={singleFixResult.mockLocation} />
            <Row label="时间戳" value={singleFixResult.locationTimestampMs ? new Date(singleFixResult.locationTimestampMs).toLocaleTimeString() : '-'} />
            {singleFixResult.gpsFailed && <Row label="GPS失败" value="GPS返回null，使用NETWORK备用" alert />}
            {singleFixResult.error && <Row label="错误" value={singleFixResult.error} alert />}
            <button onClick={requestSingleFix} className="mt-3 w-full py-3 rounded-full bg-orange-500 font-bold">重新测试</button>
          </div>
        ) : (
          <div className="mt-4"><p className="text-red-400 text-sm">{singleFixError}</p><button onClick={requestSingleFix} className="mt-3 w-full py-3 rounded-full bg-orange-500 font-bold">重新测试</button></div>
        )}
      </section>

      {/* 测试3：60秒持续定位 */}
      <section className="rounded-3xl bg-slate-900 p-5">
        <h2 className="text-lg font-bold flex items-center gap-2">⏱️ 测试3：持续GPS 60秒</h2>
        <p className="text-xs text-slate-500 mt-1">原生LocationManager持续定位，每2秒采样一次诊断数据。</p>
        {trackState === 'idle' ? (
          <button onClick={startTracking} className="mt-3 w-full py-3 rounded-full bg-orange-500 font-bold">开始60秒追踪</button>
        ) : (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold">追踪中... {trackSeconds}s / 60s</span>
              <span className="text-xs text-slate-400">回调 {trackPoints} 次</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 transition-all" style={{ width: `${(trackSeconds / 60) * 100}%` }} />
            </div>
            <div className="mt-3 max-h-40 overflow-y-auto bg-slate-950 rounded-xl p-2 text-[10px] font-mono text-slate-400 space-y-0.5">
              {trackLog.map((l, i) => <div key={i}>{l}</div>)}
              {trackLog.length === 0 && <div className="text-slate-600">等待GPS回调...</div>}
            </div>
          </div>
        )}
      </section>

      {/* 诊断结论 */}
      <section className="rounded-3xl bg-slate-900 p-5">
        <h2 className="text-lg font-bold flex items-center gap-2">🔍 诊断结论</h2>
        <div className="mt-2 text-xs space-y-2 text-slate-300">
          <p>完成测试1→测试2→测试3后参考以下流向：</p>
          <ul className="list-disc pl-4 space-y-1 text-slate-400">
            <li>精确定位未授权 → 禁止开始户外跑，引导开启</li>
            <li>GPS_PROVIDER关闭 → 打开系统定位设置</li>
            <li>单次定位失败 → 检查权限/系统GPS/原生层</li>
            <li>单次成功+持续无回调 → 检查Service/线程/厂商限制</li>
            <li>持续回调正常+距离0 → 检查evaluator/SQLite/React同步</li>
            <li>原生距离{'>'}0+UI=0 → 检查事件名/监听/状态同步</li>
          </ul>
        </div>
      </section>
    </div>
  </div>);
}

function Row({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className={`font-mono ${alert ? 'text-red-400 font-bold' : 'text-slate-200'}`}>{value}</span></div>;
}
