// E23跑起来 · 本地数据层
// 铁律：多人后端未上线前，不生成假跑者、假排行、假全班进度、假动态。
// 本文件只管理本机真实数据：用户资料、跑步记录。多人统计一律走 MULTIPLAYER_ENABLED 闸门。

export interface UserProfile {
  nickname: string;      // App昵称（可单独修改）
  wxName: string;        // 初始昵称来源（正式版为微信昵称；当前为测试登录输入）
  color: string;         // 头像底色占位（真实头像需微信授权后替换为URL）
  avatarUrl?: string;    // 自定义头像
  phone?: string;        // 登录手机号
  joinedAt: number;
  authMode: 'test' | 'server';   // test=本机测试登录；server=后端账号
  serverId?: string;             // 后端用户ID
  classId?: string;              // 班级ID（从Supabase profiles读取）
  serverStatus?: 'pending' | 'approved' | 'rejected'; // 后端审批状态
  serverRole?: 'member' | 'admin';
}

export interface RunRecord {
  id: string;            // 同时作为后端幂等键 clientId
  ts: number;            // 完成时间
  km: number;
  durationSec: number;
  avgPaceSec: number;    // 秒/公里
  source: 'gps' | 'sim' | 'manual' | 'import' | 'joyrun';
  startedAt?: number;    // 开始时间（上传后端需要）
  syncState?: 'local' | 'queued' | 'ok' | 'rejected'; // 与后端的同步状态
}

const USER_KEY = 'e23_user_v1';
const RECORDS_KEY = 'e23_records_v1';
const PACK_KEY = 'e23_mappack_v1';

const AVATAR_COLORS = ['#FF6B1A', '#0EA5E9', '#22C55E', '#A855F7', '#EF4444', '#F59E0B', '#14B8A6', '#EC4899'];

class Store {
  user: UserProfile | null = null;
  records: RunRecord[] = [];
  customPack: string | null = null;
  version = 0; // 每次数据变更自增，驱动 React 重渲染
  private listeners = new Set<() => void>();

  constructor() {
    try {
      const u = localStorage.getItem(USER_KEY);
      if (u) this.user = JSON.parse(u);
      const r = localStorage.getItem(RECORDS_KEY);
      if (r) this.records = JSON.parse(r);
      this.customPack = localStorage.getItem(PACK_KEY);
      // APP启动时如果已登录，通知原生层
      if (this.user) {
        // 延迟执行确保APP完全启动
        setTimeout(() => this.syncNativeUserId(), 500);
      }
    } catch { /* 本地数据损坏时从空开始，不清除原数据 */ }
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
  private emit() { this.version++; this.listeners.forEach((f) => f()); }

  /** 通知原生层当前登录用户ID（用于SQLite数据隔离） */
  private async syncNativeUserId() {
    try {
      const { default: GpsRun } = await import('../providers/nativeGpsPlugin');
      const userId = this.user?.serverId || this.user?.phone || '';
      await GpsRun.setCurrentUser({ userId });
    } catch { /* 非原生环境忽略 */ }
  }

  login(nickname: string, phone?: string) {
    const rnd = Math.floor(Math.random() * AVATAR_COLORS.length);
    this.user = { nickname, wxName: nickname, color: AVATAR_COLORS[rnd], phone, joinedAt: Date.now(), authMode: 'test' };
    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    this.syncNativeUserId();
    this.emit();
  }

  /** 后端账号登录（AuthAPI 成功后调用） */
  loginBackend(u: { id: string; nickname: string; avatarUrl: string | null; phone: string; role: 'member' | 'admin'; status: 'pending' | 'approved' | 'rejected'; classId?: string }) {
    const rnd = Math.floor(Math.random() * AVATAR_COLORS.length);
    this.user = {
      nickname: u.nickname,
      wxName: u.nickname,
      color: AVATAR_COLORS[rnd],
      avatarUrl: u.avatarUrl ?? undefined,
      phone: u.phone,
      joinedAt: Date.now(),
      authMode: 'server',
      serverId: u.id,
      classId: u.classId,
      serverStatus: u.status,
      serverRole: u.role,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    this.syncNativeUserId();
    this.emit();
  }

  setServerStatus(status: 'pending' | 'approved' | 'rejected') {
    if (!this.user) return;
    this.user.serverStatus = status;
    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    this.emit();
  }

  updateRecordSync(id: string, state: RunRecord['syncState']) {
    const r = this.records.find((x) => x.id === id);
    if (!r) return;
    r.syncState = state;
    localStorage.setItem(RECORDS_KEY, JSON.stringify(this.records.slice(0, 500)));
    this.emit();
  }

  logout() {
    this.user = null;
    localStorage.removeItem(USER_KEY);
    // 通知原生层清除用户ID，后续SQLite操作不可读取任何数据
    this.syncNativeUserId();
    // 后端 token 一并清除（动态 import 避免循环依赖）
    import('../api/client').then((m) => m.setToken(null)).catch(() => {});
    this.emit();
  }

  rename(name: string) {
    if (!this.user) return;
    this.user.nickname = name.slice(0, 12);
    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    this.emit();
  }

  setAvatar(url: string) {
    if (!this.user) return;
    this.user.avatarUrl = url;
    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    this.emit();
  }

  addRecord(rec: RunRecord) {
    this.records.unshift(rec);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(this.records.slice(0, 500)));
    this.emit();
    // 同步到Supabase（异步，不阻塞）
    this.syncRecordToCloud(rec);
  }

  /** 将新记录异步写入Supabase */
  private async syncRecordToCloud(rec: RunRecord) {
    try {
      const { isSupabaseEnabled } = await import('../lib/supabase');
      if (!isSupabaseEnabled() || !this.user?.serverId) return;
      const { CloudRunRepo } = await import('../repositories/CloudRepository');
      const result = await CloudRunRepo.upsertActivity({
        client_id: rec.id,
        user_id: this.user.serverId,
        class_id: this.user.classId || undefined,
        distance_m: Math.round(rec.km * 1000),
        duration_sec: rec.durationSec,
        avg_pace_sec: rec.avgPaceSec,
        source: rec.source === 'joyrun' ? 'joyrun' : rec.source === 'gps' ? 'gps' : 'manual',
        status: 'valid',
        started_at: rec.startedAt ? new Date(rec.startedAt).toISOString() : new Date(rec.ts - rec.durationSec * 1000).toISOString(),
        ended_at: new Date(rec.ts).toISOString(),
      });
      if (result.ok) {
        rec.syncState = 'ok';
        localStorage.setItem(RECORDS_KEY, JSON.stringify(this.records.slice(0, 500)));
        this.emit();
      }
    } catch { /* 离线时静默失败，下次启动或手动刷新时重试 */ }
  }

  /** 从Supabase加载当前用户的活动列表 */
  async loadCloudRecords(): Promise<boolean> {
    try {
      const { isSupabaseEnabled } = await import('../lib/supabase');
      if (!isSupabaseEnabled() || !this.user?.serverId) return false;
      const { CloudRunRepo } = await import('../repositories/CloudRepository');
      const result = await CloudRunRepo.listByUser(this.user.serverId);
      if (!result.ok || !result.data) return false;
      const records: RunRecord[] = (result.data as Array<Record<string, unknown>>).map((a) => ({
        id: a.client_id as string,
        ts: new Date((a.ended_at || a.created_at) as string).getTime(),
        km: ((a.distance_m as number) || 0) / 1000,
        durationSec: (a.duration_sec as number) || 0,
        avgPaceSec: (a.avg_pace_sec as number) || 0,
        source: (a.source as RunRecord['source']) || 'manual',
        startedAt: a.started_at ? new Date(a.started_at as string).getTime() : undefined,
        syncState: 'ok',
      }));
      // 合并：云端记录为主，本地未同步记录补充
      const cloudIds = new Set(records.map((r) => r.id));
      const localOnly = this.records.filter((r) => !cloudIds.has(r.id));
      this.records = [...records, ...localOnly];
      localStorage.setItem(RECORDS_KEY, JSON.stringify(this.records.slice(0, 500)));
      this.emit();
      return true;
    } catch { return false; }
  }

  setCustomPack(json: string | null) {
    this.customPack = json;
    if (json) localStorage.setItem(PACK_KEY, json);
    else localStorage.removeItem(PACK_KEY);
    this.emit();
  }

  // ---- 本机真实统计 ----
  get myTotalKm() { return this.records.reduce((s, r) => s + r.km, 0); }
  // 全班累计：多人后端未上线前 = 本机贡献；上线后 = 全体E23成员真实跑量之和
  get classTotalKm() { return this.myTotalKm; }
  get myTodayKm() {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    return this.records.filter((r) => r.ts >= d0.getTime()).reduce((s, r) => s + r.km, 0);
  }
  get myTodayCount() {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    return this.records.filter((r) => r.ts >= d0.getTime()).length;
  }
  get myMonthKm() {
    const n = new Date();
    const m0 = new Date(n.getFullYear(), n.getMonth(), 1).getTime();
    return this.records.filter((r) => r.ts >= m0).reduce((s, r) => s + r.km, 0);
  }
  get myAvgPaceSec() {
    const t = this.records.reduce((s, r) => s + r.durationSec, 0);
    const k = this.myTotalKm;
    return k > 0 ? t / k : 0;
  }
  get myRunCount() { return this.records.length; }
  get myRunDays() { return new Set(this.records.map((r) => new Date(r.ts).toDateString())).size; }
}

export const store = new Store();

export function fmtPace(secPerKm: number): string {
  if (!secPerKm || !isFinite(secPerKm) || secPerKm <= 0) return `--'--"`;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
