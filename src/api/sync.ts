// 离线上传队列（本机 outbox）：跑步记录先落本地，联网后自动回补
// 队列持久化在 localStorage，重启 App 不丢；幂等由后端 clientId 唯一约束保证。
import { apiFetch, isApiEnabled, ApiError } from './client';
import type {
  ActivityPayload, AuthResponse, ClassProgress, CreateActivityResponse,
  IntegrationCatalogEntry, LeaderboardRow, MyStats, ProviderStatus, ProviderSyncResult, SyncResponse,
} from './types';

const OUTBOX_KEY = 'e23_outbox_v1';

export interface OutboxItem extends ActivityPayload {
  queuedAt: string;
  attempts: number;
  lastError?: string;
}

export function getOutbox(): OutboxItem[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch { return []; }
}

function saveOutbox(items: OutboxItem[]) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(0, 200))); } catch { /* 满则丢最旧 */ }
}

export function enqueue(payload: ActivityPayload) {
  const items = getOutbox();
  if (items.some((i) => i.clientId === payload.clientId)) return; // 去重
  items.push({ ...payload, queuedAt: new Date().toISOString(), attempts: 0 });
  saveOutbox(items);
}

export function removeFromOutbox(clientId: string) {
  saveOutbox(getOutbox().filter((i) => i.clientId !== clientId));
}

export const AuthAPI = {
  register(phone: string, password: string, nickname: string, inviteCode: string) {
    return apiFetch<AuthResponse>('/api/auth/register', { method: 'POST', auth: false, body: { phone, password, nickname, inviteCode } });
  },
  login(phone: string, password: string) {
    return apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', auth: false, body: { phone, password } });
  },
  me() {
    return apiFetch<{ user: import('./types').ApiUser }>('/api/auth/me');
  },
  patchMe(patch: { nickname?: string; avatarUrl?: string }) {
    return apiFetch<{ user: import('./types').ApiUser }>('/api/auth/me', { method: 'PATCH', body: patch });
  },
};

export const ActivityAPI = {
  create(payload: ActivityPayload) {
    return apiFetch<CreateActivityResponse>('/api/activities', { method: 'POST', body: payload });
  },
  sync(activities: ActivityPayload[]) {
    return apiFetch<SyncResponse>('/api/activities/sync', { method: 'POST', body: { activities } });
  },
  mine() {
    return apiFetch<{ activities: import('./types').ApiActivity[] }>('/api/activities/mine');
  },
  myStats() {
    return apiFetch<MyStats>('/api/activities/mine/stats');
  },
};

export const ClassAPI = {
  progress() {
    return apiFetch<ClassProgress>('/api/class/progress');
  },
  leaderboard() {
    return apiFetch<{ leaderboard: LeaderboardRow[]; serverTime: string }>('/api/class/leaderboard');
  },
};

/** 接入状态目录（按钮渲染唯一事实源：服务端状态驱动，不看本地配置） */
export const IntegrationAPI = {
  catalog() {
    return apiFetch<{ catalog: IntegrationCatalogEntry[]; serverTime: string }>('/api/v1/integrations/catalog');
  },
};

/** 第三方运动平台官方授权对接（joyrun/huawei/garmin；凭据由班级申请，未配置时 enabled=false） */
export const ProviderAPI = {
  list() {
    return apiFetch<{ providers: { key: string; name: string; enabled: boolean; connected: boolean; lastSyncAt: string | null }[] }>('/api/providers');
  },
  status(provider: string) {
    return apiFetch<ProviderStatus>(`/api/providers/${provider}/status`);
  },
  authorizeUrl(provider: string) {
    return apiFetch<{ url: string }>(`/api/providers/${provider}/authorize-url`);
  },
  sync(provider: string, body?: { from?: string; to?: string }) {
    return apiFetch<ProviderSyncResult>(`/api/providers/${provider}/sync`, { method: 'POST', body: body ?? {} });
  },
  disconnect(provider: string) {
    return apiFetch<{ ok: boolean }>(`/api/providers/${provider}/disconnect`, { method: 'POST', body: {} });
  },
};

/**
 * 上传一条活动：在线直接传；离线或失败则入 outbox，返回 'queued'
 */
export async function uploadActivity(payload: ActivityPayload): Promise<'ok' | 'queued' | 'rejected'> {
  if (!isApiEnabled()) return 'queued'; // 未接后端：只存本机
  try {
    const res = await ActivityAPI.create(payload);
    removeFromOutbox(payload.clientId);
    return res.activity.status === 'rejected' ? 'rejected' : 'ok';
  } catch (e) {
    if (e instanceof ApiError && e.offline) {
      enqueue(payload);
      return 'queued';
    }
    if (e instanceof ApiError && (e.code === 'NOT_APPROVED' || e.status === 403)) {
      enqueue(payload); // 待审批：保留，审批通过后回补
      return 'queued';
    }
    enqueue(payload);
    return 'queued';
  }
}

/** 冲刷离线队列：批量同步，逐条按幂等处理 */
export async function flushOutbox(): Promise<{ sent: number; remain: number }> {
  const items = getOutbox();
  if (!items.length || !isApiEnabled()) return { sent: 0, remain: items.length };
  try {
    const res = await ActivityAPI.sync(items.map(({ queuedAt: _q, attempts: _a, lastError: _e, ...p }) => p));
    const failedIds = new Set(res.results.filter((r) => !r.ok).map((r) => r.clientId));
    const remain = items.filter((i) => failedIds.has(i.clientId));
    saveOutbox(remain);
    return { sent: res.synced, remain: remain.length };
  } catch {
    return { sent: 0, remain: items.length };
  }
}
