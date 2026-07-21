// 第三方运动平台「官方授权自动同步」通用面板（悦跑圈/华为/佳明）
// 按钮渲染铁律：以服务端 /api/v1/integrations/catalog 状态为准——
//   mock_verified 及以下    → 「尚未开放」（禁用）
//   sandbox_connected         → 「测试连接」
//   production_connected 及以上 → 「授权连接」
// 不得仅因配置文件存在就显示「授权连接」。
import { useEffect, useState } from 'react';
import { store } from '../lib/store';
import { IntegrationAPI, ProviderAPI } from '../api/sync';
import { isApiEnabled } from '../api/client';
import type { IntegrationCatalogEntry, ProviderStatus } from '../api/types';

type StageAction = 'none' | 'test' | 'connect';

function actionOf(entry: IntegrationCatalogEntry | undefined): StageAction {
  if (!entry) return 'none';
  switch (entry.implementation_status) {
    case 'sandbox_connected': return 'test';
    case 'production_connected':
    case 'pilot_verified':
    case 'generally_available': return 'connect';
    default: return 'none';
  }
}

export default function ProviderSyncPanel({ provider, name, entry: entryProp }: { provider: string; name: string; entry?: IntegrationCatalogEntry | null }) {
  const serverMode = isApiEnabled() && store.user?.authMode === 'server';
  const [st, setSt] = useState<ProviderStatus | null>(null);
  const [entrySelf, setEntrySelf] = useState<IntegrationCatalogEntry | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const entry = entryProp !== undefined ? entryProp : entrySelf;
  const action = serverMode ? actionOf(entry ?? undefined) : 'none';

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get('oauth');
    if (r) {
      const [p, result] = r.split(':');
      if (p === provider) {
        queueMicrotask(() => setMsg(result === 'connected' ? `✅ ${name}授权成功，点「立即同步」拉取记录` : `❌ ${name}授权未完成，请重试`));
      }
      q.delete('oauth');
      const qs = q.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
    if (!serverMode) return;
    ProviderAPI.status(provider).then(setSt).catch(() => setSt(null));
    if (entryProp === undefined) {
      IntegrationAPI.catalog()
        .then((r) => setEntrySelf(r.catalog.find((c) => c.provider === provider) ?? null))
        .catch(() => setEntrySelf(null));
    }
  }, [provider, name, serverMode, entryProp]);

  const doAuthorize = async () => {
    setBusy(true); setMsg('');
    try {
      const { url } = await ProviderAPI.authorizeUrl(provider);
      window.location.href = url;
    } catch {
      setMsg(`授权发起失败：${name}凭据未配置或网络异常`);
      setBusy(false);
    }
  };

  const doSync = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await ProviderAPI.sync(provider);
      setMsg(`✅ 同步完成：新计入 ${r.imported} 条，已存在 ${r.duplicated} 条${r.pending ? `，待审核 ${r.pending} 条` : ''}（${r.from} ~ ${r.to}）`);
      setSt(await ProviderAPI.status(provider));
    } catch {
      setMsg('同步失败：网络异常或授权已过期，请稍后重试');
    }
    setBusy(false);
  };

  const doDisconnect = async () => {
    setBusy(true); setMsg('');
    try {
      await ProviderAPI.disconnect(provider);
      setSt(st ? { ...st, connected: false, lastSyncAt: null, connectedAt: null } : null);
      setMsg(`已断开${name}连接（平台侧撤销+本地凭据清除）`);
    } catch {
      setMsg('操作失败，请稍后重试');
    }
    setBusy(false);
  };

  return (
    <div className="mt-2 bg-white rounded-xl border border-slate-200 p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm font-bold text-slate-800">官方授权自动同步</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">
          {entry ? entry.implementation_status : '状态获取中'}
        </span>
      </div>

      {!serverMode && (
        <div className="text-xs text-slate-400">本机模式不可用：登录班级账号后显示{name}接入状态。</div>
      )}

      {serverMode && entry && action === 'none' && !st?.connected && (
        <div className="space-y-1.5">
          <div className="text-xs text-slate-500">{entry.user_visible_message}</div>
          <button disabled className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 text-sm font-bold cursor-not-allowed">尚未开放</button>
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer text-slate-500">接入所需资质与风险</summary>
            <ul className="mt-1 space-y-0.5 list-disc pl-4">
              {entry.required_qualifications.map((q) => <li key={q}>{q}</li>)}
            </ul>
            <div className="mt-1">商业风险：{entry.commercial_risk}</div>
          </details>
        </div>
      )}

      {serverMode && action !== 'none' && !st?.connected && (
        <button onClick={doAuthorize} disabled={busy}
          className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold active:bg-slate-700 disabled:opacity-50">
          {busy ? '跳转中…' : action === 'test' ? `🔗 测试连接${name}` : `🔗 授权连接${name}`}
        </button>
      )}

      {serverMode && st?.connected && (
        <div className="space-y-2">
          <div className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-2">
            已连接{name}{st.lastSyncAt ? ` · 上次同步 ${new Date(st.lastSyncAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ' · 尚未同步过'}
          </div>
          <div className="flex gap-2">
            <button onClick={doSync} disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold active:bg-orange-600 disabled:opacity-50">
              {busy ? '同步中…' : '立即同步'}
            </button>
            <button onClick={doDisconnect} disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-bold active:bg-slate-200 disabled:opacity-50">
              断开
            </button>
          </div>
        </div>
      )}

      {msg && <div className="text-xs text-slate-600 mt-2">{msg}</div>}
    </div>
  );
}
