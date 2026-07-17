// E23跑起来 · 本地数据层
// 说明：真实多人同步需要后端服务；当前为本地+班级演示数据，后端接入点已在 integrations.ts 预留

export interface UserProfile {
  nickname: string;      // 微信名（可修改为APP专用名）
  wxName: string;        // 原始微信名
  color: string;         // 头像底色（微信头像占位，真实头像需微信授权后替换为URL）
  avatarUrl?: string;    // 自定义头像
  joinedAt: number;
}

export interface RunRecord {
  id: string;
  ts: number;            // 完成时间
  km: number;
  durationSec: number;
  avgPaceSec: number;    // 秒/公里
  source: 'gps' | 'sim' | 'import';
}

export interface Teammate {
  name: string;
  color: string;
  totalKm: number;
  todayKm: number;
  streak: number;        // 连续打卡天数
}

const USER_KEY = 'e23_user_v1';
const RECORDS_KEY = 'e23_records_v1';
const PACK_KEY = 'e23_mappack_v1';

const AVATAR_COLORS = ['#FF6B1A', '#0EA5E9', '#22C55E', '#A855F7', '#EF4444', '#F59E0B', '#14B8A6', '#EC4899'];

// E23班戈壁挑战赛队友（演示数据，真实排名需后端同步）
const CLASSMATES: Array<[string, number, number, number]> = [
  ['老戈·队长', 386, 6.2, 47],
  ['大漠飞鹰', 342, 0, 12],
  ['戈壁石头', 318, 8.1, 33],
  ['追风姐', 296, 5.0, 28],
  ['沙棘花', 274, 3.6, 21],
  ['骆驼刺', 251, 0, 9],
  ['胡杨林', 233, 7.4, 18],
  ['祁连雪', 215, 0, 6],
  ['飞天', 198, 4.2, 15],
  ['清泉', 176, 0, 4],
  ['星辰', 152, 5.8, 11],
  ['小白杨', 121, 0, 3],
];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// 按当天日期给队友一点"活"的跑量（演示用，确定性伪随机）
function buildTeammates(): Teammate[] {
  const daySeed = Math.floor(Date.now() / 86400000);
  const rnd = seeded(daySeed);
  return CLASSMATES.map(([name, total, today, streak], i) => ({
    name,
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    totalKm: Math.round((total + rnd() * 2) * 10) / 10,
    todayKm: today > 0 ? Math.round(today * (0.8 + rnd() * 0.4) * 10) / 10 : 0,
    streak,
  }));
}

class Store {
  user: UserProfile | null = null;
  records: RunRecord[] = [];
  teammates: Teammate[] = [];
  customPack: string | null = null; // 导入的地图包JSON
  private listeners = new Set<() => void>();

  constructor() {
    try {
      const u = localStorage.getItem(USER_KEY);
      if (u) this.user = JSON.parse(u);
      const r = localStorage.getItem(RECORDS_KEY);
      if (r) this.records = JSON.parse(r);
      this.customPack = localStorage.getItem(PACK_KEY);
    } catch { /* ignore */ }
    this.teammates = buildTeammates();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
  private emit() { this.listeners.forEach((f) => f()); }

  login(nickname: string) {
    const rnd = Math.floor(Math.random() * AVATAR_COLORS.length);
    this.user = { nickname, wxName: nickname, color: AVATAR_COLORS[rnd], joinedAt: Date.now() };
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

  // ---- 统计 ----
  get myTotalKm() { return this.records.reduce((s, r) => s + r.km, 0); }
  get myTodayKm() {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    return this.records.filter((r) => r.ts >= d0.getTime()).reduce((s, r) => s + r.km, 0);
  }
  get myAvgPaceSec() {
    const t = this.records.reduce((s, r) => s + r.durationSec, 0);
    const k = this.myTotalKm;
    return k > 0 ? t / k : 0;
  }
  get myRunDays() { return new Set(this.records.map((r) => new Date(r.ts).toDateString())).size; }
  get teamTotalKm() { return this.teammates.reduce((s, t) => s + t.totalKm, 0) + this.myTotalKm; }
  get teamTodayKm() { return this.teammates.reduce((s, t) => s + t.todayKm, 0) + this.myTodayKm; }
  get todayCheckins() { return this.teammates.filter((t) => t.todayKm > 0).length + (this.myTodayKm > 0 ? 1 : 0); }
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
