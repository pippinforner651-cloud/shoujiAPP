import type { DiagnosticsResponse } from '../providers/nativeGpsPlugin';

interface Props {
  diagnostics: DiagnosticsResponse | null;
  pluginAvailable: boolean;
  uiDistanceM: number;
  uiLocationEvents: number;
  onOpenAppSettings(): void;
  onOpenLocationSettings(): void;
}

const yesNo = (value: boolean | undefined) => value ? '开启' : '关闭';
const time = (value: number | undefined) => value ? new Date(value).toLocaleTimeString('zh-CN', { hour12: false }) : '从未';

export function LiveGpsDiagnostics({ diagnostics: d, pluginAvailable, uiDistanceM, uiLocationEvents, onOpenAppSettings, onOpenLocationSettings }: Props) {
  const permission = d?.locationPermission === 'precise' ? '精确' : d?.locationPermission === 'approximate' ? '大概' : '拒绝';
  return <section className="rounded-2xl border border-slate-700 bg-slate-950/90 p-4 text-left" aria-label="真机GPS诊断">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-black text-orange-300">真机GPS诊断</h3>
      <span className="text-[11px] text-slate-400">每1秒刷新</span>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
      <Item label="定位权限" value={permission} alert={permission !== '精确'} />
      <Item label="系统GPS" value={yesNo(d?.gpsEnabled)} alert={!d?.gpsEnabled} />
      <Item label="原生插件" value={pluginAvailable && d?.pluginLoaded !== false ? '可用' : '不可用'} alert={!pluginAvailable} />
      <Item label="Service" value={d?.serviceRunning ? '运行' : '停止'} alert={!d?.serviceRunning} />
      <Item label="GPS请求" value={d?.locationRequestSucceeded ? '成功' : '失败'} alert={!d?.locationRequestSucceeded} />
      <Item label="总回调" value={String(d?.locationCallbackCount ?? 0)} />
      <Item label="GPS回调" value={String(d?.gpsCallbackCount ?? 0)} />
      <Item label="NETWORK回调" value={String(d?.networkCallbackCount ?? 0)} />
      <Item label="最后回调" value={time(d?.lastLocationCallbackMs)} />
      <Item label="最后provider" value={d?.lastCallbackProvider || '无'} />
      <Item label="最后精度" value={d?.lastAccuracy ? `${d.lastAccuracy.toFixed(1)}m` : '无'} />
      <Item label="firstFix" value={d?.firstFixReceived ? 'true' : 'false'} alert={!d?.firstFixReceived} />
      <Item label="有效/拒绝点" value={`${d?.validPoints ?? 0}/${d?.rejectedPoints ?? 0}`} />
      <Item label="拒绝原因" value={d?.lastRejectReason || '无'} />
      <Item label="SQLite写入" value={String(d?.sqliteWriteOk ?? 0)} />
      <Item label="locationUpdate" value={String(uiLocationEvents)} />
      <Item label="原生距离" value={`${(d?.totalDistanceM ?? 0).toFixed(1)}m`} />
      <Item label="UI距离" value={`${uiDistanceM.toFixed(1)}m`} />
    </div>
    {permission === '拒绝' && <p className="mt-3 text-xs font-bold text-red-300">定位权限未授权</p>}
    {permission === '大概' && <p className="mt-3 text-xs font-bold text-amber-300">仅大概位置，无法准确计距</p>}
    {d && !d.systemLocationEnabled && <p className="mt-3 text-xs font-bold text-red-300">手机定位未开启</p>}
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" className="rounded-full bg-slate-700 px-3 py-2 text-xs font-bold" onClick={onOpenAppSettings}>打开应用定位设置</button>
      <button type="button" className="rounded-full bg-slate-700 px-3 py-2 text-xs font-bold" onClick={onOpenLocationSettings}>打开系统定位设置</button>
    </div>
  </section>;
}

function Item({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className="min-w-0"><div className="text-[10px] text-slate-500">{label}</div><div className={`truncate font-mono ${alert ? 'text-amber-300' : 'text-slate-200'}`}>{value}</div></div>;
}
