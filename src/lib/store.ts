// E23跑起来 · 本地数据层
// 铁律：多人后端未上线前，不生成假跑者、假排行、假全班进度、假动态。
// 本文件只管理本机真实数据：用户资料、跑步记录。多人统计一律走 MULTIPLAYER_ENABLED 闸门。

export interface UserProfile {
  nickname: string;      // App昵称（可单独修改）
  wxName: string;        // 初始昵称来源（正式版为微信昵称；当前为测试登录输入）
  color: string;         // 头像底色占位（真实头像需微信授权后替换为URL）
  avatarUrl?: string;    // 自定义头像
  phone?: string;        // 测试登录手机号
  joinedAt: number;
}

export interface RunRecord {
  id: string;
  ts: number;            // 完成时间
  km: number;
  durationSec: number;
  avgPaceSec: number;    // 秒/公里
  source: 'gps' | 'sim' | 'manual' | 'import';
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
    } catch { /* 本地数据损坏时从空开始，不清除原数据 */ }
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
  private emit() { this.version++; this.listeners.forEach((f) => f()); }

  login(nickname: string, phone?: string) {
    const rnd = Math.floor(Math.random() * AVATAR_COLORS.length);
    this.user = { nickname, wxName: nickname, color: AVATAR_COLORS[rnd], phone, joinedAt: Date.now() };
    localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    this.emit();
  }

  logout() {
    this.user = null;
    localStorage.removeItem(USER_KEY);
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
