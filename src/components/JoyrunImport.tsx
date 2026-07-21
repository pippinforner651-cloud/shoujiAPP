// 悦跑圈数据接入组件
//   A. 官方授权自动同步（推荐，通用 ProviderSyncPanel）：OAuth 一次授权 → 一键拉取
//   B. 轨迹文件导入：悦跑圈导出 GPX/TCX → 本组件解析 → 带轨迹上传，服务端按轨迹规则校验，合规即计入
//   C. 凭证补录：填写日期/距离/时长 + 凭证说明 → source=joyrun 上传，一律 pending，管理员审核后计入
// 本机模式（未配置后端）下 B/C 只保存到本机，不伪装已同步。
import { useRef, useState } from 'react';
import { store } from '../lib/store';
import { parseTrackFile, type ParsedTrack } from '../lib/gpx';
import { uploadActivity } from '../api/sync';
import { isApiEnabled } from '../api/client';
import ProviderSyncPanel from './ProviderSyncPanel';

function newClientId() {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmtPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '-';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function JoyrunImport() {
  const [tab, setTab] = useState<'file' | 'manual'>('file');
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedTrack | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseErr, setParseErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // 凭证补录表单
  const today = new Date().toISOString().slice(0, 10);
  const [mDate, setMDate] = useState(today);
  const [mKm, setMKm] = useState('');
  const [mMin, setMMin] = useState('');
  const [mNote, setMNote] = useState('');

  const serverMode = isApiEnabled() && store.user?.authMode === 'server';

  const onPickFile = async (f: File) => {
    setParseErr(''); setParsed(null); setMsg('');
    setFileName(f.name);
    const text = await f.text();
    const p = parseTrackFile(text);
    if (!p) {
      setParseErr('无法解析该文件：请从悦跑圈导出 GPX 或 TCX 格式（需含轨迹点与时间）');
      return;
    }
    setParsed(p);
  };

  const submitFile = async () => {
    if (!parsed || busy) return;
    setBusy(true); setMsg('');
    const id = newClientId();
    const km = Math.round((parsed.distanceM / 1000) * 100) / 100;
    const startMs = Date.parse(parsed.startedAt);
    store.addRecord({
      id, ts: Date.parse(parsed.endedAt), km,
      durationSec: parsed.durationSec,
      avgPaceSec: Math.round(parsed.durationSec / (parsed.distanceM / 1000)),
      source: 'joyrun', startedAt: startMs, syncState: 'local',
    });
    if (serverMode) {
      const r = await uploadActivity({
        clientId: id,
        source: 'joyrun',
        distanceM: parsed.distanceM,
        durationSec: parsed.durationSec,
        startedAt: parsed.startedAt,
        endedAt: parsed.endedAt,
        trackPoints: parsed.points,
        evidenceNote: `悦跑圈${parsed.format.toUpperCase()}轨迹导入（${fileName}，原始${parsed.pointCountRaw}点）`,
      });
      store.updateRecordSync(id, r === 'ok' ? 'ok' : r === 'rejected' ? 'rejected' : 'queued');
      setMsg(r === 'ok'
        ? '✅ 已上传，服务端校验通过并计入班级里程'
        : r === 'rejected'
          ? '❌ 服务端校验未通过（轨迹异常），详见我的记录'
          : '📥 已存入待同步队列（离线或账号待审批）');
    } else {
      setMsg('本机模式：记录已保存在本机（配置后端后可在「我的」页同步）');
    }
    setParsed(null); setFileName('');
    setBusy(false);
  };

  const submitManual = async () => {
    const km = parseFloat(mKm);
    const min = parseFloat(mMin);
    if (!km || km <= 0 || !min || min <= 0 || !mNote.trim() || busy) return;
    setBusy(true); setMsg('');
    const dayMs = new Date(`${mDate}T12:00:00`).getTime();
    const durSec = Math.round(min * 60);
    const start = (isNaN(dayMs) ? Date.now() : dayMs) - durSec * 1000;
    const id = newClientId();
    store.addRecord({
      id, ts: start + durSec * 1000, km: Math.round(km * 100) / 100,
      durationSec: durSec, avgPaceSec: Math.round(durSec / km),
      source: 'joyrun', startedAt: start, syncState: 'local',
    });
    if (serverMode) {
      const r = await uploadActivity({
        clientId: id,
        source: 'joyrun',
        distanceM: Math.round(km * 1000),
        durationSec: durSec,
        startedAt: new Date(start).toISOString(),
        endedAt: new Date(start + durSec * 1000).toISOString(),
        evidenceNote: `悦跑圈凭证补录：${mNote.trim()}`,
      });
      store.updateRecordSync(id, r === 'ok' ? 'ok' : r === 'rejected' ? 'rejected' : 'queued');
      setMsg(r === 'rejected'
        ? '❌ 服务端校验未通过（数值异常），详见我的记录'
        : '✅ 已提交，悦跑圈凭证记录待管理员审核后计入班级里程');
    } else {
      setMsg('本机模式：记录已保存在本机（配置后端后可在「我的」页同步）');
    }
    setMKm(''); setMMin(''); setMNote('');
    setBusy(false);
  };

  return (
    <div className="mt-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
      <ProviderSyncPanel provider="joyrun" name="悦跑圈" />

      <div className="px-3.5 pt-2.5 pb-2 text-xs text-slate-400 leading-relaxed">
        其他导入方式（均 1:1 计入，不翻倍）：
      </div>
      <div className="grid grid-cols-2 text-center text-sm font-bold border-t border-slate-100">
        <button onClick={() => setTab('file')} className={`py-2.5 ${tab === 'file' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-slate-400'}`}>轨迹文件导入</button>
        <button onClick={() => setTab('manual')} className={`py-2.5 ${tab === 'manual' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-slate-400'}`}>凭证补录</button>
      </div>

      {tab === 'file' && (
        <div className="p-3.5 space-y-2.5">
          <div className="text-xs text-slate-400 leading-relaxed">
            在悦跑圈导出跑步记录的 <b>GPX / TCX</b> 文件后上传。带真实轨迹的记录由服务端按轨迹规则校验，通过即直接计入。
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={busy}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold active:bg-slate-200">
            {fileName || '选择 GPX / TCX 文件'}
          </button>
          <input ref={fileRef} type="file" accept=".gpx,.tcx,.xml" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.target.value = ''; }} />
          {parseErr && <div className="text-xs text-red-500">{parseErr}</div>}
          {parsed && (
            <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-800 space-y-1">
              <div className="font-bold text-sm">解析成功（{parsed.format.toUpperCase()}）</div>
              <div>日期：{new Date(parsed.startedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div>距离：{(parsed.distanceM / 1000).toFixed(2)} km · 时长：{Math.round(parsed.durationSec / 60)} 分钟 · 配速：{fmtPace(parsed.durationSec / (parsed.distanceM / 1000))}/km</div>
              <div>轨迹点：{parsed.points.length} 个{parsed.pointCountRaw > parsed.points.length ? `（原始 ${parsed.pointCountRaw} 点已抽稀）` : ''}</div>
              <button onClick={submitFile} disabled={busy}
                className="mt-1.5 w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold active:bg-orange-600 disabled:opacity-50">
                {busy ? '上传中…' : '确认导入'}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'manual' && (
        <div className="p-3.5 space-y-2.5">
          <div className="text-xs text-slate-400 leading-relaxed">
            无轨迹文件时，填写悦跑圈记录信息并注明凭证（如「截图已发班级群」）。<b>一律待管理员审核</b>，通过后才计入。
          </div>
          <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 text-sm outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={mKm} onChange={(e) => setMKm(e.target.value.replace(/[^\d.]/g, ''))} placeholder="距离（公里）" inputMode="decimal"
              className="px-3 py-2.5 rounded-xl bg-slate-50 text-sm outline-none placeholder:text-slate-400" />
            <input value={mMin} onChange={(e) => setMMin(e.target.value.replace(/[^\d.]/g, ''))} placeholder="时长（分钟）" inputMode="decimal"
              className="px-3 py-2.5 rounded-xl bg-slate-50 text-sm outline-none placeholder:text-slate-400" />
          </div>
          <input value={mNote} onChange={(e) => setMNote(e.target.value)} placeholder="凭证说明（必填）：如 悦跑圈截图已发班级群"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 text-sm outline-none placeholder:text-slate-400" />
          {mKm && mMin && parseFloat(mKm) > 0 && (
            <div className="text-xs text-slate-400">平均配速约 {fmtPace((parseFloat(mMin) * 60) / parseFloat(mKm))}/km</div>
          )}
          <button onClick={submitManual} disabled={busy || !mKm || !mMin || !mNote.trim()}
            className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold active:bg-orange-600 disabled:opacity-40">
            {busy ? '提交中…' : '提交审核'}
          </button>
        </div>
      )}

      {msg && <div className="px-3.5 pb-3 text-xs text-slate-600">{msg}</div>}
    </div>
  );
}
