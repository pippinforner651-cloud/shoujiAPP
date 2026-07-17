import { useRef, useState, useSyncExternalStore } from 'react';
import { store, fmtPace, fmtDuration } from '../lib/store';
import { INTEGRATIONS, getActivePack, validateMapPack } from '../lib/integrations';

export default function ProfilePage() {
  useSyncExternalStore((f) => store.subscribe(f), () => store);
  const me = store.user;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me?.nickname || '');
  const [packMsg, setPackMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const pack = getActivePack(store.customPack);
  const [showInt, setShowInt] = useState<string | null>(null);

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
            <div className="text-xs text-white/80 mt-1">微信名：{me.wxName} · E23班 · 戈壁挑战赛队友</div>
          </div>
        </div>
      </div>

      {/* 我的数据 */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm grid grid-cols-4 divide-x divide-slate-100 py-4">
          <Stat v={store.myTotalKm.toFixed(1)} u="km" l="累计跑量" />
          <Stat v={fmtPace(store.myAvgPaceSec)} l="平均配速" />
          <Stat v={String(store.myRunDays)} u="天" l="跑步打卡" />
          <Stat v={store.myTodayKm.toFixed(1)} u="km" l="今日" />
        </div>
      </div>

      {/* 跑步记录 */}
      <Section title="我的跑步记录">
        {store.records.length === 0 && <div className="text-sm text-slate-400 px-1 py-3">还没有记录，去「跑步」页完成第一跑吧</div>}
        <div className="space-y-2">
          {store.records.slice(0, 10).map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3.5 py-2.5">
              <div>
                <div className="font-bold text-slate-800 tabular-nums">{r.km.toFixed(2)} km</div>
                <div className="text-xs text-slate-500">{new Date(r.ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {r.source === 'gps' ? 'GPS' : r.source === 'sim' ? '演示' : '导入'}</div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>{fmtDuration(r.durationSec)}</div>
                <div>{fmtPace(r.avgPaceSec)}/km</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 数据接入 */}
      <Section title="数据接入（接口已预留）">
        <div className="space-y-2">
          {INTEGRATIONS.map((it) => (
            <button key={it.key} onClick={() => setShowInt(showInt === it.key ? null : it.key)}
              className="w-full flex items-center gap-3 bg-slate-50 rounded-xl px-3.5 py-3 text-left">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">
                {{ wechat: '💬', joyrun: '👟', garmin: '⌚', huawei: '⌚', apple: '⌚' }[it.key]}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-800">{it.name}</div>
                <div className="text-xs text-slate-500">{showInt === it.key ? it.requirement : it.desc}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-500">待接入</span>
            </button>
          ))}
        </div>
      </Section>

      {/* 地图包 */}
      <Section title="地图包（全球跑预留）">
        <div className="bg-slate-50 rounded-xl px-3.5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">{pack.name}</div>
              <div className="text-xs text-slate-500">{pack.nodes.length} 站 · {pack.totalKm.toLocaleString()} km · v{pack.version}</div>
            </div>
            {store.customPack && (
              <button onClick={() => { store.setCustomPack(null); setPackMsg('已恢复环中国默认路线'); }} className="text-xs px-2.5 py-1.5 rounded-full bg-white text-slate-600 shadow-sm">恢复默认</button>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => fileRef.current?.click()} className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold active:bg-orange-600">导入地图包</button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && importPack(e.target.files[0])} />
          </div>
          {packMsg && <div className="text-xs text-orange-600 mt-2">{packMsg}</div>}
          <div className="text-xs text-slate-400 mt-2">支持导入他人分享的地图包（JSON），环球跑、城市跑等路线遵循同一格式</div>
        </div>
      </Section>

      <div className="px-4 mt-4">
        <button onClick={() => store.logout()} className="w-full py-3 rounded-2xl bg-white text-slate-500 text-sm shadow-sm">退出登录</button>
        <div className="text-center text-xs text-slate-400 mt-4">E23跑起来 · 健康到永远 v2.0</div>
      </div>
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
