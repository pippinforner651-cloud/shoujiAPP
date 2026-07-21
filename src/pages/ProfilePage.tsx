import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { store, fmtPace, fmtDuration } from '../lib/store';
import { INTEGRATIONS, getActivePack, validateMapPack } from '../lib/integrations';
import { CONFIG } from '../config';
import { isApiEnabled, ApiError } from '../api/client';
import { ActivityAPI, flushOutbox, getOutbox } from '../api/sync';
import type { MyStats } from '../api/types';
import JoyrunImport from '../components/JoyrunImport';
import ProviderSyncPanel from '../components/ProviderSyncPanel';
import DiagnosticPanel from '../components/DiagnosticPanel';

// 路线包完整性校验值（FNV-1a，用于版本核对与回滚校验）
function packChecksum(p: { nodes: unknown[]; totalKm: number }): string {
  const s = JSON.stringify(p.nodes) + p.totalKm;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export default function ProfilePage() {
  useSyncExternalStore((f) => store.subscribe(f), () => store.version);
  const me = store.user;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me?.nickname || '');
  const [packMsg, setPackMsg] = useState('');
  const [showRouteReport, setShowRouteReport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const pack = getActivePack(store.customPack);
  const [showInt, setShowInt] = useState<string | null>(null);
  const checksum = useMemo(() => packChecksum(pack), [pack]);
  const contribution = pack.totalKm > 0 ? (store.myTotalKm / pack.totalKm) * 100 : 0;

  // 服务端统计（后端账号时）：以服务端为唯一事实源，本机未同步单独显示
  const serverMode = isApiEnabled() && me?.authMode === 'server';
  const [stats, setStats] = useState<MyStats | null>(null);
  const [statsState, setStatsState] = useState<'idle' | 'ok' | 'offline' | 'error'>('idle');
  const [outboxN, setOutboxN] = useState(getOutbox().length);
  const [flushMsg, setFlushMsg] = useState('');

  useEffect(() => {
    if (!serverMode) return;
    let alive = true;
    ActivityAPI.myStats()
      .then((s) => { if (alive) { setStats(s); setStatsState('ok'); } })
      .catch((e) => { if (alive) setStatsState(e instanceof ApiError && e.offline ? 'offline' : 'error'); });
    queueMicrotask(() => { if (alive) setOutboxN(getOutbox().length); });
    return () => { alive = false; };
  }, [serverMode, store.version]);

  const doFlush = async () => {
    setFlushMsg('同步中…');
    const r = await flushOutbox();
    setOutboxN(getOutbox().length);
    setFlushMsg(r.sent > 0 ? `已同步 ${r.sent} 条${r.remain > 0 ? `，剩余 ${r.remain} 条` : ''}` : r.remain > 0 ? '仍未成功（离线或待审批）' : '队列已清空');
  };

  if (!me) return null;

  const importPack = (f: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const p = validateMapPack(JSON.parse(String(rd.result)));
        if (p) {
          store.setCustomPack(String(rd.result));
          setPackMsg(`已启用「${p.name}」，共 ${p.nodes.length} 站`);
        } else setPackMsg('地图包格式不正确');
      } catch { setPackMsg('地图包解析失败'); }
    };
    rd.readAsText(f);
  };

  const pickAvatar = (f: File) => {
    const rd = new FileReader();
    rd.onload = () => store.setAvatar(String(rd.result));
    rd.readAsDataURL(f);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-6">
      {/* 个人资料 */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 px-5 pt-6 pb-8 text-white">
        <div className="flex items-center gap-4">
          <button onClick={() => avatarRef.current?.click()} className="relative">
            {me.avatarUrl ? (
              <img src={me.avatarUrl} className="w-16 h-16 rounded-full object-cover ring-2 ring-white/60" />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black ring-2 ring-white/60" style={{ background: me.color }}>
                {me.nickname.slice(0, 1)}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 bg-white text-orange-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold">换</span>
          </button>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickAvatar(e.target.files[0])} />
          <div className="flex-1">
            {editing ? (
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={12}
                  className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-slate-800 text-sm font-bold outline-none" autoFocus />
                <button onClick={() => { if (name.trim()) store.rename(name.trim()); setEditing(false); }} className="px-3 py-1.5 bg-white text-orange-600 rounded-lg text-sm font-bold">保存</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-black">{me.nickname}</span>
                <button onClick={() => { setName(me.nickname); setEditing(true); }} className="text-xs bg-white/20 px-2 py-1 rounded-full">改昵称</button>
              </div>
            )}
            <div className="text-xs text-white/80 mt-1">E23班 · 戈壁挑战赛队友{me.phone ? ` · ${me.phone.slice(0, 3)}****${me.phone.slice(-4)}` : ''}</div>
          </div>
        </div>
      </div>

      {/* 我的数据：累计/次数/配速/贡献比例 */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm grid grid-cols-4 divide-x divide-slate-100 py-4">
          <Stat v={store.myTotalKm.toFixed(1)} u="km" l="累计跑量" />
          <Stat v={String(store.myRunCount)} u="次" l="运动次数" />
          <Stat v={fmtPace(store.myAvgPaceSec)} l="平均配速" />
          <Stat v={contribution.toFixed(2)} u="%" l="环线贡献" />
        </div>
      </div>

      {/* 服务端统计（后端账号时显示，唯一事实源） */}
      {serverMode && (
        <Section title="服务端统计（班级后端唯一事实源）">
          {statsState === 'ok' && stats ? (
            <div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-emerald-50 rounded-xl py-2.5">
                  <div className="font-black text-slate-800 tabular-nums">{(stats.totalM / 1000).toFixed(1)}</div>
                  <div className="text-[10px] text-slate-500">服务端有效 km</div>
                </div>
                <div className="bg-emerald-50 rounded-xl py-2.5">
                  <div className="font-black text-slate-800 tabular-nums">{stats.totalCount}</div>
                  <div className="text-[10px] text-slate-500">有效次数</div>
                </div>
                <div className="bg-amber-50 rounded-xl py-2.5">
                  <div className="font-black text-slate-800 tabular-nums">{stats.pendingCount}</div>
                  <div className="text-[10px] text-slate-500">待审核条数</div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 text-center">
                服务端时间 {new Date(stats.serverTime).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 px-1 py-2">
              {statsState === 'offline' ? '后端暂不可达（离线模式）：以下方本机数据为准' : statsState === 'error' ? '服务端统计读取失败' : '读取中…'}
            </div>
          )}
          {/* 待同步队列：与本机已统计分开显示 */}
          {(outboxN > 0 || statsState !== 'idle') && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                待同步 <b className={outboxN > 0 ? 'text-amber-600' : 'text-slate-700'}>{outboxN}</b> 条（未计入服务端统计）
              </div>
              {outboxN > 0 && (
                <button onClick={doFlush} className="text-xs px-3 py-1.5 rounded-full bg-orange-500 text-white font-bold active:bg-orange-600">立即同步</button>
              )}
            </div>
          )}
          {flushMsg && <div className="text-[10px] text-slate-400 mt-1 text-right">{flushMsg}</div>}
        </Section>
      )}

      {/* 跑步记录 */}
      <Section title={serverMode ? '我的跑步记录（本机缓存 + 同步状态）' : '我的跑步记录（本机保存，关闭应用不丢失）'}>
        {store.records.length === 0 && <div className="text-sm text-slate-400 px-1 py-3">还没有记录，去「跑步」页完成第一跑</div>}
        <div className="space-y-2">
          {store.records.slice(0, 10).map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3.5 py-2.5">
              <div>
                <div className="font-bold text-slate-800 tabular-nums">{r.km.toFixed(2)} km</div>
                <div className="text-xs text-slate-500">{new Date(r.ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {{ gps: 'GPS', sim: '演示', manual: '手动补录', import: '导入', joyrun: '悦跑圈' }[r.source]}</div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>{fmtDuration(r.durationSec)}</div>
                <div>{fmtPace(r.avgPaceSec)}/km</div>
                {serverMode && r.syncState && (
                  <div className={`text-[10px] mt-0.5 ${{ ok: 'text-emerald-600', queued: 'text-amber-600', rejected: 'text-red-500', local: 'text-slate-400' }[r.syncState]}`}>
                    {{ ok: '已同步', queued: '待同步', rejected: '校验未通过', local: '本机' }[r.syncState]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 设备与数据来源 */}
      <Section title="设备与数据来源">
        <div className="space-y-2">
          {INTEGRATIONS.map((it) => (
            <div key={it.key}>
              <button onClick={() => setShowInt(showInt === it.key ? null : it.key)}
                className="w-full flex items-center gap-3 bg-slate-50 rounded-xl px-3.5 py-3 text-left">
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">
                  {{ wechat: '💬', joyrun: '👟', garmin: '⌚', huawei: '⌚', apple: '⌚' }[it.key]}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-800">{it.name}</div>
                  <div className="text-xs text-slate-500">{showInt === it.key ? it.requirement : it.desc}</div>
                </div>
                {it.key === 'joyrun' ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">可导入</span>
                ) : it.key === 'garmin' || it.key === 'huawei' ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-500">尚未开放</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-500">暂不可直连</span>
                )}
              </button>
              {it.key === 'joyrun' && showInt === 'joyrun' && <JoyrunImport />}
              {(it.key === 'garmin' || it.key === 'huawei') && showInt === it.key && (
                <ProviderSyncPanel provider={it.key} name={it.name} />
              )}
            </div>
          ))}
          <div className="text-xs text-slate-400 px-1 pt-1">尚未实现：后台锁屏GPS · 心率 · 步频 · 海拔 · 云同步（不伪装）</div>
        </div>
      </Section>

      {/* GPS诊断 */}
      <Section title="GPS诊断">
        <DiagnosticPanel />
      </Section>

      {/* 地图包与路线状态 */}
      <Section title="地图包与路线状态">
        <div className="bg-slate-50 rounded-xl px-3.5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">{pack.name}</div>
              <div className="text-xs text-slate-500">{pack.nodes.filter((n) => n.name).length} 站 · {pack.totalKm.toLocaleString()} km · v{pack.version}</div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${CONFIG.ROUTE_STATUS === 'DRAFT' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {CONFIG.ROUTE_STATUS === 'DRAFT' ? 'DRAFT 待核验' : '正式'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">完整性校验值：<span className="font-mono text-slate-700">{checksum}</span></div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowRouteReport(true)} className="flex-1 py-2 rounded-xl bg-white text-slate-700 text-sm font-bold shadow-sm">路线校验报告</button>
            <button onClick={() => fileRef.current?.click()} className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold active:bg-orange-600">导入地图包</button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && importPack(e.target.files[0])} />
          </div>
          {store.customPack && (
            <button onClick={() => { store.setCustomPack(null); setPackMsg('已回滚到环中国默认路线包'); }} className="mt-2 w-full py-2 rounded-xl bg-white text-slate-600 text-sm shadow-sm">回滚到默认路线包</button>
          )}
          {packMsg && <div className="text-xs text-orange-600 mt-2">{packMsg}</div>}
          <div className="text-xs text-slate-400 mt-2">预留统一地图接口：未来支持高德等正式地图服务与全球跑地图包</div>
        </div>
      </Section>

      <div className="px-4 mt-4">
        <button onClick={() => store.logout()} className="w-full py-3 rounded-2xl bg-white text-slate-500 text-sm shadow-sm">退出登录</button>
        <div className="text-center text-xs text-slate-400 mt-4">
          E23跑起来 · {CONFIG.APP_EDITION} · 健康到永远<br />
          Commit {CONFIG.COMMIT_SHA} · GPS引擎: Native Foreground Service · DB: Android SQLite<br />
          测试状态: Phase 1 GPS Beta
        </div>
      </div>

      {/* 路线校验报告抽屉 */}
      {showRouteReport && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-white rounded-t-3xl shadow-2xl max-h-[70%] overflow-y-auto">
          <div className="sticky top-0 bg-white rounded-t-3xl px-5 pt-3 pb-2 border-b border-slate-100">
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-3" />
            <div className="flex items-start justify-between">
              <div className="text-lg font-black text-slate-800">路线校验报告 <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full ml-1">DRAFT</span></div>
              <button onClick={() => setShowRouteReport(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500">✕</button>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3 text-sm text-slate-600 leading-relaxed">
            <Block t="路线来源" d="G228/G331/G219 三条国道构成的标准环中国自驾环线，起终点为深圳北大汇丰商学院；站点为沿线真实城镇，景点美食为公开资料整理。" />
            <Block t="生成方式" d="人工编排 130 个命名站点 + 真实国道里程校准 + 对界河/海岸段沿官方版图边界描 46 个途经点，总里程 27,171 km（≥27,000 达标）。" />
            <Block t="几何校验" d="以官方公开中国版图 GeoJSON 为基准，对全线按 0.08°（约 9km）步长采样做点内检测：初检 26 段出界，经三轮修正后剩余 7 处 ≤3 个采样点的贴界误差（北极村、五卡等端点本身位于国界线上）。" />
            <Block t="里程误差" d="分段里程来自公开国道资料 + 直线比例校准，非实测轨迹里程，预计误差 ±10%；总里程以三条国道公布里程为锚（G219 10,065 / G331 9,301 / G228 约 7,800 km）。" />
            <Block t="未核验项" d="① 分段里程未与实测轨迹比对；② 海峡段（琼州海峡等）以轮渡等价里程计入，未单列；③ 站点坐标为城镇中心近似值。" />
            <Block t="结论" d="保持 DRAFT，不得标记正式。待实测轨迹或正式地图服务（高德等）接入后复核升版。" />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ v, u, l }: { v: string; u?: string; l: string }) {
  return (
    <div className="text-center">
      <div className="font-black text-slate-800">{v}<span className="text-xs font-normal text-slate-400">{u}</span></div>
      <div className="text-xs text-slate-500 mt-0.5">{l}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 mt-4">
      <div className="text-sm font-bold text-slate-700 mb-2">{title}</div>
      <div className="bg-white rounded-2xl shadow-sm p-3">{children}</div>
    </div>
  );
}

function Block({ t, d }: { t: string; d: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="font-bold text-slate-800 text-sm mb-1">{t}</div>
      <div className="text-xs leading-relaxed">{d}</div>
    </div>
  );
}
