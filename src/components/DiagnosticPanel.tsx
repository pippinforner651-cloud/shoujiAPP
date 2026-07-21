// ============================================================
// E23跑起来 · GPS诊断面板
// 显示手机/GPS/Service运行状态详细信息
// 支持复制诊断信息、跳转系统设置
// ============================================================
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import GpsRun from '../providers/nativeGpsPlugin';
import type { DiagnosticsResponse } from '../providers/nativeGpsPlugin';

export default function DiagnosticPanel() {
  const [diag, setDiag] = useState<DiagnosticsResponse | null>(null);
  const [exportedLog, setExportedLog] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  const exportLog = async () => {
    try {
      const r = await GpsRun.exportDiagnosticLog();
      setExportedLog(r.log);
      setShowLog(true);
    } catch {
      setExportedLog('导出失败');
      setShowLog(true);
    }
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('GpsRun')) return;
    let alive = true;
    const fetch = () => {
      GpsRun.getDiagnostics().then((d) => { if (alive) setDiag(d); }).catch(() => {});
    };
    fetch();
    const iv = setInterval(fetch, 5000); // 每5秒刷新
    return () => { alive = false; clearInterval(iv); };
  }, []);

  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('GpsRun')) {
    return <div className="text-sm text-slate-500 px-1 py-3">GPS诊断仅Android原生APP可用</div>;
  }

  if (!diag) {
    return <div className="text-sm text-slate-500 px-1 py-3">诊断数据加载中...</div>;
  }

  const copyToClipboard = () => {
    const text = `手机品牌: ${diag.phoneBrand}
手机型号: ${diag.phoneModel}
Android版本: ${diag.androidVersion}
Service运行: ${diag.serviceRunning ? '是' : '否'}
运行状态: ${['空闲', '跑步中', '已暂停'][diag.runState ?? 0] ?? '未知'}
当前活动: ${diag.activityId || '无'}
总距离: ${((diag.totalDistanceM ?? 0) / 1000).toFixed(2)} km
最后一次GPS回调: ${diag.lastLocationCallbackMs ? new Date(diag.lastLocationCallbackMs).toLocaleTimeString() : '从未'}
最后一次SQLite写入: ${diag.lastSqliteWriteMs ? new Date(diag.lastSqliteWriteMs).toLocaleTimeString() : '从未'}
最后一次通知更新: ${diag.lastNotificationUpdateMs ? new Date(diag.lastNotificationUpdateMs).toLocaleTimeString() : '从未'}
定位精度: ${diag.lastAccuracy ? diag.lastAccuracy.toFixed(1) + 'm' : 'N/A'}
有效GPS点数: ${diag.validPoints ?? 0}
无效GPS点数: ${diag.rejectedPoints ?? 0}
锁屏状态: ${diag.screenOff ? '是' : '否'}
后台状态: ${diag.appBackgrounded ? '是' : '否'}
GPS回调次数: ${diag.locationCallbackCount ?? 0}
GPS接受次数: ${diag.locationAcceptedCount ?? 0}
GPS拒绝次数: ${diag.locationRejectedCount ?? 0}
SQLite写入成功: ${diag.sqliteWriteOk ?? 0}
SQLite写入失败: ${diag.sqliteWriteFailed ?? 0}
最近错误: ${diag.lastError || '无'}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopyMsg('已复制');
      setTimeout(() => setCopyMsg(''), 2000);
    }).catch(() => {
      setCopyMsg('复制失败');
    });
  };

  return (
    <div className="text-xs space-y-2">
      <table className="w-full">
        <tbody>
          <DiagRow label="手机" value={`${diag.phoneBrand} ${diag.phoneModel}`} />
          <DiagRow label="Android" value={diag.androidVersion} />
          <DiagRow label="Service" value={diag.serviceRunning ? '🟢 运行中' : '🔴 未运行'} />
          <DiagRow label="状态" value={['空闲', '🏃 跑步中', '⏸ 已暂停'][diag.runState ?? 0] ?? '未知'} />
          <DiagRow label="当前活动" value={diag.activityId ? diag.activityId.slice(-12) : '无'} />
          <DiagRow label="GPS回调" value={diag.lastLocationCallbackMs
            ? new Date(diag.lastLocationCallbackMs).toLocaleTimeString() : '从未'} />
          <DiagRow label="SQLite写入" value={diag.lastSqliteWriteMs
            ? new Date(diag.lastSqliteWriteMs).toLocaleTimeString() : '从未'} />
          <DiagRow label="通知更新" value={diag.lastNotificationUpdateMs
            ? new Date(diag.lastNotificationUpdateMs).toLocaleTimeString() : '从未'} />
          <DiagRow label="GPS精度" value={diag.lastAccuracy ? `${diag.lastAccuracy.toFixed(1)}m` : 'N/A'} />
          <DiagRow label="有效/无效点数" value={`${diag.validPoints ?? 0} / ${diag.rejectedPoints ?? 0}`} />
          <DiagRow label="锁屏中" value={diag.screenOff ? '是' : '否'} />
          <DiagRow label="后台中" value={diag.appBackgrounded ? '是' : '否'} />
          <DiagRow label="GPS回调/接受/拒绝" value={`${diag.locationCallbackCount ?? 0}/${diag.locationAcceptedCount ?? 0}/${diag.locationRejectedCount ?? 0}`} />
          <DiagRow label="SQLite成功/失败" value={`${diag.sqliteWriteOk ?? 0}/${diag.sqliteWriteFailed ?? 0}`} />
          <DiagRow label="最近错误" value={diag.lastError || '无'} highlight={!!diag.lastError} />
        </tbody>
      </table>

      <div className="flex flex-wrap gap-2 mt-2">
        <button onClick={copyToClipboard} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold active:bg-slate-200">
          {copyMsg || '📋 复制诊断信息'}
        </button>
        <button onClick={exportLog} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold active:bg-slate-200">
          📤 导出诊断日志
        </button>
        <button onClick={() => window.open('android.settings.LOCATION_SOURCE_SETTINGS')}
          className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold active:bg-slate-200">
          📍 定位设置
        </button>
        <button onClick={() => window.open('android.settings.APPLICATION_DETAILS_SETTINGS')}
          className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold active:bg-slate-200">
          🔔 应用详情
        </button>
        <button onClick={() => window.open('android.settings.BATTERY_OPTIMIZATION_SETTINGS')}
          className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold active:bg-slate-200">
          🔋 电池优化
        </button>
      </div>

      {showLog && (
        <div className="mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-500 text-xs">诊断日志</span>
            <button onClick={() => setShowLog(false)} className="text-slate-400 text-xs">关闭</button>
          </div>
          <textarea readOnly value={exportedLog}
            className="w-full h-40 text-[10px] font-mono bg-slate-50 border rounded-lg p-2 text-slate-700"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()} />
        </div>
      )}
    </div>
  );
}

function DiagRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <tr className={highlight ? 'bg-red-50' : ''}>
      <td className="text-slate-500 py-1 pr-2 whitespace-nowrap w-24">{label}</td>
      <td className={`font-mono py-1 ${highlight ? 'text-red-600 font-bold' : 'text-slate-800'}`}>{value}</td>
    </tr>
  );
}
