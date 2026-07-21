// 第三方运动平台适配器：统一契约（12 方法）+ 注册表
// 铁律：平台不支持的方法必须显式返回 not_supported，不得空实现；
//      字段映射差异收敛在各平台 normalizeActivity；当前三平台均仅通过模拟上游验证（mock_verified）。
import { createHmac, randomBytes } from 'node:crypto';
import { GARMIN, HUAWEI, JOYRUN } from '../config.js';

export interface NormalizedRun {
  runId: string;
  distanceM: number;
  durationSec: number;
  avgPaceSec: number;
  startedAt: string;
  endedAt: string;
}

export interface ProviderTokens {
  openId: string;
  accessToken: string;
  tokenSecret: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}

export interface ConnSecrets {
  accessToken: string;
  tokenSecret: string | null;
  refreshToken: string | null;
}

export interface SyncCursor { from: string; to: string; }

export type AdapterResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: 'not_supported' | 'upstream' | 'invalid_response'; message: string };

function notSupported<T>(what: string): AdapterResult<T> {
  return { ok: false, code: 'not_supported', message: what };
}

export interface ProviderErrorInfo { code: string; message: string; retryable: boolean; }

/** 统一适配器契约：十二方法。不支持必须返回 not_supported。 */
export interface ProviderAdapter {
  key: string;
  name: string;
  enabled(): boolean;
  getAuthorizationUrl(input: { state: string; storeRequestSecret?: (secret: string) => Promise<void> }): Promise<AdapterResult<{ url: string }>>;
  exchangeAuthorization(input: { code?: string; oauthToken?: string; oauthVerifier?: string; requestSecret?: string | null }): Promise<AdapterResult<ProviderTokens>>;
  refreshAuthorization(conn: ConnSecrets): Promise<AdapterResult<ProviderTokens>>;
  revokeAuthorization(conn: ConnSecrets): Promise<AdapterResult<{ revoked: boolean }>>;
  pullActivities(conn: ConnSecrets, cursor: SyncCursor): Promise<AdapterResult<{ runs: NormalizedRun[]; nextCursor: SyncCursor }>>;
  normalizeActivity(raw: unknown): NormalizedRun | null;
  getSyncCursor(conn: ConnSecrets): Promise<AdapterResult<SyncCursor>>;
  saveSyncCursor(conn: ConnSecrets, cursor: SyncCursor): Promise<AdapterResult<Record<string, never>>>;
  handleWebhook(headers: Record<string, unknown>, rawBody: string): Promise<AdapterResult<{ events: unknown[] }>>;
  verifyWebhookSignature(headers: Record<string, unknown>, rawBody: string): Promise<AdapterResult<{ valid: boolean }>>;
  mapProviderError(err: unknown): ProviderErrorInfo;
}

function toEpochMs(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n > 1e12 ? n : n * 1000;
}

function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = new Date(`${from}T00:00:00Z`).getTime(); t <= new Date(`${to}T00:00:00Z`).getTime(); t += 86400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

async function fetchJson(url: string | URL, init?: RequestInit): Promise<{ status: number; data: unknown }> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function pickArray(data: unknown, keys: string[]): unknown[] {
  if (Array.isArray(data)) return data;
  for (const k of keys) {
    const v = (data as Record<string, unknown>)?.[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function defaultMapError(platform: string) {
  return (err: unknown): ProviderErrorInfo => {
    const msg = err instanceof Error ? err.message : String(err);
    const m = /HTTP (\d+)/.exec(msg);
    const status = m ? Number(m[1]) : 0;
    return {
      code: status === 401 || status === 403 ? 'authorization_expired' : status >= 500 ? 'upstream_unavailable' : 'unknown',
      message: `${platform}：${msg}`,
      retryable: status === 0 || status >= 500 || status === 429,
    };
  };
}

// ============================== 悦跑圈（OAuth2.0，Pull 模式） ==============================
const joyrun: ProviderAdapter = {
  key: 'joyrun',
  name: '悦跑圈',
  enabled: () => JOYRUN.ENABLED,
  async getAuthorizationUrl({ state }) {
    const u = new URL(`${JOYRUN.API_BASE}/oauth/authorize`);
    u.searchParams.set('client_id', JOYRUN.CLIENT_ID);
    u.searchParams.set('redirect_uri', JOYRUN.REDIRECT_URI);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('state', state);
    return { ok: true, value: { url: u.toString() } };
  },
  async exchangeAuthorization({ code }) {
    if (!code) return { ok: false, code: 'invalid_response', message: '缺少授权码' };
    const { status, data } = await fetchJson(`${JOYRUN.API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: JOYRUN.CLIENT_ID, client_secret: JOYRUN.CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: JOYRUN.REDIRECT_URI }),
    });
    if (status >= 400) return { ok: false, code: 'upstream', message: `悦跑圈令牌交换失败 HTTP ${status}` };
    const d = data as Record<string, unknown>;
    if (!d.access_token) return { ok: false, code: 'invalid_response', message: '悦跑圈令牌响应缺少 access_token' };
    return { ok: true, value: {
      openId: String(d.open_id ?? d.openid ?? d.uid ?? 'unknown'),
      accessToken: String(d.access_token),
      tokenSecret: null,
      refreshToken: d.refresh_token ? String(d.refresh_token) : null,
      expiresAt: d.expires_in ? new Date(Date.now() + Number(d.expires_in) * 1000) : null,
    } };
  },
  async refreshAuthorization(conn) {
    if (!conn.refreshToken) return notSupported('悦跑圈未签发 refresh_token，无法刷新');
    const { status, data } = await fetchJson(`${JOYRUN.API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: JOYRUN.CLIENT_ID, client_secret: JOYRUN.CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: conn.refreshToken }),
    });
    if (status >= 400) return { ok: false, code: 'upstream', message: `悦跑圈令牌刷新失败 HTTP ${status}` };
    const d = data as Record<string, unknown>;
    if (!d.access_token) return { ok: false, code: 'invalid_response', message: '悦跑圈刷新响应缺少 access_token' };
    return { ok: true, value: {
      openId: String(d.open_id ?? d.openid ?? 'unknown'),
      accessToken: String(d.access_token),
      tokenSecret: null,
      refreshToken: d.refresh_token ? String(d.refresh_token) : conn.refreshToken,
      expiresAt: d.expires_in ? new Date(Date.now() + Number(d.expires_in) * 1000) : null,
    } };
  },
  revokeAuthorization() {
    // 公开资料未见悦跑圈令牌撤销端点；断开时本地凭据清除，平台侧撤销引导用户在悦跑圈内操作
    return Promise.resolve(notSupported('悦跑圈无公开令牌撤销端点：已本地清除凭据，平台侧需在悦跑圈App内解除授权'));
  },
  async pullActivities(conn, cursor) {
    const runs: NormalizedRun[] = [];
    for (const date of dateRange(cursor.from, cursor.to)) {
      const u = new URL(`${JOYRUN.API_BASE}/run/detail/date`);
      u.searchParams.set('date', date);
      const res = await fetch(u, { headers: { authorization: `Bearer ${conn.accessToken}` } });
      if (!res.ok) return { ok: false, code: 'upstream', message: `悦跑圈记录拉取失败 HTTP ${res.status}` };
      for (const raw of pickArray(await res.json(), ['data', 'runs', 'list'])) {
        const run = joyrun.normalizeActivity(raw);
        if (run) runs.push(run);
      }
    }
    return { ok: true, value: { runs, nextCursor: cursor } };
  },
  normalizeActivity(raw) {
    const r = raw as Record<string, unknown>;
    const runId = String(r.runid ?? r.run_id ?? r.run_uuid ?? r.id ?? '');
    const distanceM = Number(r.meter ?? r.distance ?? r.distanceM ?? NaN);
    const durationSec = Number(r.second ?? r.duration ?? r.durationSec ?? NaN);
    const startMs = toEpochMs(r.starttime ?? r.start_time) ?? (r.startedAt ? Date.parse(String(r.startedAt)) : null);
    if (!runId || !Number.isFinite(distanceM) || !Number.isFinite(durationSec) || startMs == null || Number.isNaN(startMs)) return null;
    const pace = Number(r.pace ?? NaN);
    return {
      runId, distanceM: Math.round(distanceM), durationSec: Math.round(durationSec),
      avgPaceSec: Number.isFinite(pace) ? Math.round(pace) : Math.round(durationSec / (distanceM / 1000)),
      startedAt: new Date(startMs).toISOString(),
      endedAt: new Date(startMs + Math.round(durationSec) * 1000).toISOString(),
    };
  },
  getSyncCursor: () => Promise.resolve(notSupported('同步游标由服务端数据库（lastSyncAt）管理，平台侧无游标概念')),
  saveSyncCursor: () => Promise.resolve(notSupported('同步游标由服务端数据库（lastSyncAt）管理，平台侧无游标概念')),
  handleWebhook: () => Promise.resolve(notSupported('悦跑圈无公开 Webhook 推送能力（当前为 Pull 模式）')),
  verifyWebhookSignature: () => Promise.resolve(notSupported('悦跑圈无公开 Webhook 推送能力，无验签需求')),
  mapProviderError: defaultMapError('悦跑圈'),
};

// ============================== 华为运动健康（OAuth2.0，Pull 模式） ==============================
const huawei: ProviderAdapter = {
  key: 'huawei',
  name: '华为运动健康',
  enabled: () => HUAWEI.ENABLED,
  async getAuthorizationUrl({ state }) {
    const u = new URL(`${HUAWEI.AUTH_BASE}/oauth2/v3/authorize`);
    u.searchParams.set('client_id', HUAWEI.CLIENT_ID);
    u.searchParams.set('redirect_uri', HUAWEI.REDIRECT_URI);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', 'https://www.huawei.com/healthkit/activity.read');
    u.searchParams.set('state', state);
    return { ok: true, value: { url: u.toString() } };
  },
  async exchangeAuthorization({ code }) {
    if (!code) return { ok: false, code: 'invalid_response', message: '缺少授权码' };
    const { status, data } = await fetchJson(`${HUAWEI.AUTH_BASE}/oauth2/v3/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: HUAWEI.CLIENT_ID, client_secret: HUAWEI.CLIENT_SECRET, redirect_uri: HUAWEI.REDIRECT_URI }).toString(),
    });
    if (status >= 400) return { ok: false, code: 'upstream', message: `华为令牌交换失败 HTTP ${status}` };
    const d = data as Record<string, unknown>;
    if (!d.access_token) return { ok: false, code: 'invalid_response', message: '华为令牌响应缺少 access_token' };
    return { ok: true, value: {
      openId: String(d.open_id ?? d.union_id ?? 'unknown'),
      accessToken: String(d.access_token),
      tokenSecret: null,
      refreshToken: d.refresh_token ? String(d.refresh_token) : null,
      expiresAt: d.expires_in ? new Date(Date.now() + Number(d.expires_in) * 1000) : null,
    } };
  },
  async refreshAuthorization(conn) {
    if (!conn.refreshToken) return notSupported('华为未签发 refresh_token，无法刷新');
    const { status, data } = await fetchJson(`${HUAWEI.AUTH_BASE}/oauth2/v3/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refreshToken, client_id: HUAWEI.CLIENT_ID, client_secret: HUAWEI.CLIENT_SECRET }).toString(),
    });
    if (status >= 400) return { ok: false, code: 'upstream', message: `华为令牌刷新失败 HTTP ${status}` };
    const d = data as Record<string, unknown>;
    if (!d.access_token) return { ok: false, code: 'invalid_response', message: '华为刷新响应缺少 access_token' };
    return { ok: true, value: {
      openId: String(d.open_id ?? 'unknown'),
      accessToken: String(d.access_token),
      tokenSecret: null,
      refreshToken: d.refresh_token ? String(d.refresh_token) : conn.refreshToken,
      expiresAt: d.expires_in ? new Date(Date.now() + Number(d.expires_in) * 1000) : null,
    } };
  },
  async revokeAuthorization(conn) {
    // 华为 OAuth2 令牌撤销端点
    const { status } = await fetchJson(`${HUAWEI.AUTH_BASE}/oauth2/v3/revoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: conn.accessToken, client_id: HUAWEI.CLIENT_ID, client_secret: HUAWEI.CLIENT_SECRET }).toString(),
    });
    if (status >= 400) return { ok: false, code: 'upstream', message: `华为令牌撤销失败 HTTP ${status}（本地凭据仍将清除）` };
    return { ok: true, value: { revoked: true } };
  },
  async pullActivities(conn, cursor) {
    const u = new URL(`${HUAWEI.API_BASE}/healthkit/v1/activityRecords`);
    u.searchParams.set('startTime', new Date(`${cursor.from}T00:00:00Z`).toISOString());
    u.searchParams.set('endTime', new Date(`${cursor.to}T23:59:59Z`).toISOString());
    const res = await fetch(u, { headers: { authorization: `Bearer ${conn.accessToken}` } });
    if (!res.ok) return { ok: false, code: 'upstream', message: `华为记录拉取失败 HTTP ${res.status}` };
    const runs: NormalizedRun[] = [];
    for (const raw of pickArray(await res.json(), ['activityRecords', 'data', 'records'])) {
      const run = huawei.normalizeActivity(raw);
      if (run) runs.push(run);
    }
    return { ok: true, value: { runs, nextCursor: cursor } };
  },
  normalizeActivity(raw) {
    const r = raw as Record<string, unknown>;
    const runId = String(r.id ?? r.recordId ?? r.activityRecordId ?? '');
    const distanceM = Number(r.distance ?? r.distanceM ?? r.totalDistance ?? NaN);
    const durationSec = Number(r.duration ?? r.durationSec ?? r.totalDuration ?? NaN);
    const startMs = toEpochMs(r.startTime ?? r.start_time) ?? (r.startTime ? Date.parse(String(r.startTime)) : null);
    if (!runId || !Number.isFinite(distanceM) || !Number.isFinite(durationSec) || startMs == null || Number.isNaN(startMs)) return null;
    const pace = Number(r.pace ?? NaN);
    return {
      runId: `hw-${runId}`, distanceM: Math.round(distanceM), durationSec: Math.round(durationSec),
      avgPaceSec: Number.isFinite(pace) ? Math.round(pace) : Math.round(durationSec / (distanceM / 1000)),
      startedAt: new Date(startMs).toISOString(),
      endedAt: new Date(startMs + Math.round(durationSec) * 1000).toISOString(),
    };
  },
  getSyncCursor: () => Promise.resolve(notSupported('同步游标由服务端数据库（lastSyncAt）管理，平台侧无游标概念')),
  saveSyncCursor: () => Promise.resolve(notSupported('同步游标由服务端数据库（lastSyncAt）管理，平台侧无游标概念')),
  handleWebhook: () => Promise.resolve(notSupported('当前实现为 Pull 模式；华为 Health Kit 订阅推送需企业权限另行申请')),
  verifyWebhookSignature: () => Promise.resolve(notSupported('当前实现为 Pull 模式，未接入华为订阅推送验签')),
  mapProviderError: defaultMapError('华为运动健康'),
};

// ============================== 佳明 Garmin（OAuth 1.0a，Pull 模式） ==============================
function pct(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function oauth1Header(method: string, url: string, oauthExtra: Record<string, string>, tokenSecret: string, query: Record<string, string> = {}): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: GARMIN.CONSUMER_KEY,
    oauth_nonce: randomBytes(12).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...oauthExtra,
  };
  const allParams = { ...query, ...oauthParams };
  const base = [method.toUpperCase(), pct(url), pct(Object.keys(allParams).sort().map((k) => `${pct(k)}=${pct(allParams[k])}`).join('&'))].join('&');
  const key = `${pct(GARMIN.CONSUMER_SECRET)}&${pct(tokenSecret)}`;
  oauthParams.oauth_signature = createHmac('sha1', key).update(base).digest('base64');
  return 'OAuth ' + Object.keys(oauthParams).sort().map((k) => `${pct(k)}="${pct(oauthParams[k])}"`).join(', ');
}

function parseTokenResponse(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(text)) out[k] = v;
  return out;
}

const garmin: ProviderAdapter = {
  key: 'garmin',
  name: '佳明 Garmin',
  enabled: () => GARMIN.ENABLED,
  async getAuthorizationUrl({ state, storeRequestSecret }) {
    const callback = `${GARMIN.REDIRECT_URI}${GARMIN.REDIRECT_URI.includes('?') ? '&' : '?'}state=${encodeURIComponent(state)}`;
    const url = `${GARMIN.AUTH_BASE}/oauth-service/oauth/request_token`;
    const res = await fetch(url, { method: 'POST', headers: { authorization: oauth1Header('POST', url, { oauth_callback: callback }, '') } });
    if (!res.ok) return { ok: false, code: 'upstream', message: `佳明 request token 获取失败 HTTP ${res.status}` };
    const tok = parseTokenResponse(await res.text());
    if (!tok.oauth_token) return { ok: false, code: 'invalid_response', message: '佳明 request token 响应异常' };
    if (storeRequestSecret) await storeRequestSecret(tok.oauth_token_secret ?? '');
    const u = new URL(`${GARMIN.CONFIRM_BASE}/oauthConfirm`);
    u.searchParams.set('oauth_token', tok.oauth_token);
    return { ok: true, value: { url: u.toString() } };
  },
  async exchangeAuthorization({ oauthToken, oauthVerifier, requestSecret }) {
    if (!oauthToken || !oauthVerifier) return { ok: false, code: 'invalid_response', message: '缺少 oauth_token/oauth_verifier' };
    const url = `${GARMIN.AUTH_BASE}/oauth-service/oauth/access_token`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { authorization: oauth1Header('POST', url, { oauth_token: oauthToken, oauth_verifier: oauthVerifier }, requestSecret ?? '') },
    });
    if (!res.ok) return { ok: false, code: 'upstream', message: `佳明 access token 获取失败 HTTP ${res.status}` };
    const tok = parseTokenResponse(await res.text());
    if (!tok.oauth_token) return { ok: false, code: 'invalid_response', message: '佳明 access token 响应异常' };
    return { ok: true, value: { openId: tok.oauth_token, accessToken: tok.oauth_token, tokenSecret: tok.oauth_token_secret ?? null, refreshToken: null, expiresAt: null } };
  },
  refreshAuthorization: () => Promise.resolve(notSupported('佳明 OAuth 1.0a 无 refresh_token 机制：访问令牌长期有效，过期需重新授权')),
  revokeAuthorization: () => Promise.resolve(notSupported('佳明解除授权需用户在 Garmin Connect 内操作；本地凭据已清除')),
  async pullActivities(conn, cursor) {
    const query = {
      uploadStartTimeInSeconds: String(Math.floor(new Date(`${cursor.from}T00:00:00Z`).getTime() / 1000)),
      uploadEndTimeInSeconds: String(Math.floor(new Date(`${cursor.to}T23:59:59Z`).getTime() / 1000)),
    };
    const baseUrl = `${GARMIN.API_BASE}/wellness-api/rest/activities`;
    const res = await fetch(`${baseUrl}?${new URLSearchParams(query).toString()}`, {
      headers: { authorization: oauth1Header('GET', baseUrl, { oauth_token: conn.accessToken }, conn.tokenSecret ?? '', query) },
    });
    if (!res.ok) return { ok: false, code: 'upstream', message: `佳明记录拉取失败 HTTP ${res.status}` };
    const runs: NormalizedRun[] = [];
    for (const raw of pickArray(await res.json(), ['activities', 'data'])) {
      const run = garmin.normalizeActivity(raw);
      if (run) runs.push(run);
    }
    return { ok: true, value: { runs, nextCursor: cursor } };
  },
  normalizeActivity(raw) {
    const r = raw as Record<string, unknown>;
    const type = String(r.activityType ?? r.type ?? '').toLowerCase();
    if (type && !type.includes('run')) return null; // 仅跑步类计入
    const runId = String(r.summaryId ?? r.activityId ?? r.id ?? '');
    const distanceM = Number(r.distanceInMeters ?? r.distance ?? NaN);
    const durationSec = Number(r.durationInSeconds ?? r.duration ?? NaN);
    const startMs = toEpochMs(r.startTimeInSeconds ?? r.startTime);
    if (!runId || !Number.isFinite(distanceM) || !Number.isFinite(durationSec) || startMs == null) return null;
    return {
      runId: `gm-${runId}`, distanceM: Math.round(distanceM), durationSec: Math.round(durationSec),
      avgPaceSec: Math.round(durationSec / (distanceM / 1000)),
      startedAt: new Date(startMs).toISOString(),
      endedAt: new Date(startMs + Math.round(durationSec) * 1000).toISOString(),
    };
  },
  getSyncCursor: () => Promise.resolve(notSupported('同步游标由服务端数据库（lastSyncAt）管理，平台侧无游标概念')),
  saveSyncCursor: () => Promise.resolve(notSupported('同步游标由服务端数据库（lastSyncAt）管理，平台侧无游标概念')),
  handleWebhook: () => Promise.resolve(notSupported('佳明 Push/Webhook 模式需 Garmin 商业授权开通推送权限；当前实现为 Pull 模式')),
  verifyWebhookSignature: () => Promise.resolve(notSupported('佳明 Webhook 未接入，无验签实现')),
  mapProviderError: defaultMapError('佳明'),
};

// ============================== 注册表 ==============================
const REGISTRY: Record<string, ProviderAdapter> = { joyrun, huawei, garmin };

export const PROVIDER_KEYS = Object.keys(REGISTRY);

export function getProvider(key: string): ProviderAdapter | null {
  return REGISTRY[key] ?? null;
}
