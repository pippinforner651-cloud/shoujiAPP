/**
 * V2.0 Phase 6.3 — 统一运动数据模型
 *
 * 枚举、接口、工具函数集中定义。
 * 所有适配器、GPS 会话、导入模块统一引用此文件。
 */

/* =========================================
 * 1. 数据来源枚举
 * ========================================= */

/** 官方支持的 9 种 data source */
export type ActivitySource =
  | 'app_gps'           // 本 APP GPS 直录
  | 'health_connect'    // Android Health Connect
  | 'healthkit'         // iOS HealthKit（预留）
  | 'coros'             // 高驰 COROS
  | 'joyrun'            // 悦跑圈
  | 'wechat'            // 微信运动（评估中）
  | 'gpx_import'        // GPX 文件导入
  | 'fit_import'        // FIT 文件导入
  | 'manual';           // 手动录入

/** 带中文标签的数据来源 */
export const SOURCE_LABELS: Record<ActivitySource, string> = {
  app_gps:        '本机GPS',
  health_connect: 'Health Connect',
  healthkit:      'Apple健康',
  coros:          'COROS',
  joyrun:         '悦跑圈',
  wechat:         '微信运动',
  gpx_import:     'GPX导入',
  fit_import:     'FIT导入',
  manual:         '手动录入',
};

export const SOURCE_EMOJIS: Record<ActivitySource, string> = {
  app_gps:        '📱',
  health_connect: '🤖',
  healthkit:      '🍎',
  coros:          '⌚',
  joyrun:         '🏃',
  wechat:         '💬',
  gpx_import:     '📂',
  fit_import:     '📂',
  manual:         '✏️',
};

/**
 * 旧值 → 新值映射表
 *
 * 转换外部系统/兼容层传来的旧 ActivitySource 值到正式枚举。
 * 所有外部数据入库前必须先经过 normalizeActivitySource()。
 */
export const LEGACY_SOURCE_MAP: Record<string, ActivitySource> = {
  apple_health:  'healthkit',
  android_health:'health_connect',
  gps:           'app_gps',
  // 以下三层直接映射
  huawei_health: 'health_connect',
  garmin:        'health_connect',
  xiaomi:        'health_connect',
  mock:          'manual',
};

/** 标准化 ActivitySource — 未知来源返回 'manual' 并 console.warn */
export function normalizeActivitySource(raw: string): ActivitySource {
  const trimmed = raw.trim().toLowerCase();

  // 直接命中正式枚举
  const validSources: readonly string[] = [
    'app_gps', 'health_connect', 'healthkit', 'coros',
    'joyrun', 'wechat', 'gpx_import', 'fit_import', 'manual',
  ];
  if (validSources.includes(trimmed)) {
    return trimmed as ActivitySource;
  }

  // 旧值映射
  if (LEGACY_SOURCE_MAP[trimmed]) {
    return LEGACY_SOURCE_MAP[trimmed];
  }

  // 未知来源
  console.warn(`[normalizeActivitySource] 未知来源 "${raw}"，回退为 manual`);
  return 'manual';
}

/* =========================================
 * 2. 可信度状态
 * ========================================= */

/** 活动验证状态 */
export type VerificationStatus =
  | 'verified_device'      // 设备直录（最高可信）
  | 'verified_platform'    // 第三方平台授权同步
  | 'imported_file'        // 文件导入
  | 'manual_unverified'    // 手动录入（未验证）
  | 'duplicate'            // 重复活动（不计入排行）
  | 'invalid';             // 无效数据

/** 排行榜默认包含的可信度 */
export const RANKING_VALID_STATUSES: VerificationStatus[] = [
  'verified_device',
  'verified_platform',
  'imported_file',
];

/* =========================================
 * 3. 运动类型
 * ========================================= */
export type SportType = 'running' | 'walking' | 'cycling' | 'trail' | 'hiking';

/* =========================================
 * 4. 统一运动记录
 * ========================================= */

export interface UnifiedActivity {
  /** 活动唯一 ID */
  id: string;
  /** 用户 ID */
  userId: string;
  /** 数据来源 */
  source: ActivitySource;
  /** 外部系统活动 ID（用于去重） */
  sourceActivityId?: string;
  /** 运动类型 */
  sportType: SportType;

  /* — 时间 — */
  /** 运动开始时间 (ISO 8601) */
  startTime: string;
  /** 运动结束时间 (ISO 8601) */
  endTime?: string;
  /** 运动持续秒数 */
  durationSeconds: number;

  /* — 距离 & 配速 — */
  /** 距离（米） */
  distanceMeters: number;
  /** 配速（秒/公里） */
  paceSecondsPerKm: number;

  /* — 扩展指标 — */
  /** 消耗热量（千卡） */
  calories?: number;
  /** 平均心率 */
  avgHeartRate?: number;
  /** 最大心率 */
  maxHeartRate?: number;
  /** 累计爬升（米） */
  elevationGain?: number;

  /* — 轨迹 — */
  /** 轨迹数据（GPX 点列表） */
  routeData?: RoutePoint[];

  /* — 设备 — */
  /** 设备名称 */
  deviceName?: string;

  /* — 同步 — */
  /** 同步到云端的时间 */
  syncTime?: string;

  /* — 可信度 — */
  verificationStatus: VerificationStatus;

  /* — 去重 — */
  /** 原始数据的哈希（SHA-256 前 16 位） */
  rawDataHash?: string;

  /* — 时间戳 — */
  createdAt: string;
  updatedAt: string;
}

/** 轨迹点 */
export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  altitude?: number;
  heartRate?: number;
  cadence?: number;
}

/* =========================================
 * 5. 外部系统输入（适配器统一输入）
 * ========================================= */

export interface ExternalActivityInput {
  source: ActivitySource;
  sourceActivityId?: string;
  sportType: SportType;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  distanceMeters: number;
  paceSecondsPerKm?: number;
  calories?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  elevationGain?: number;
  routeData?: RoutePoint[];
  deviceName?: string;
  rawDataHash?: string;
}

/** 适配器返回结果 */
export interface AdapterResult {
  success: boolean;
  recordId?: string;
  error?: string;
  virtualKm?: number;
}

/* =========================================
 * 6. 工具函数
 * ========================================= */

/** 米 → 公里（保留 2 位小数） */
export function metersToKm(m: number): number {
  return Math.round(m / 10) / 100;
}

/** 公里 → 虚拟公里（×10） */
export function toVirtualKm(realKm: number): number {
  return Math.round(realKm * 10 * 100) / 100;
}

/** 计算配速（秒/公里） */
export function calcPaceSecPerKm(distanceMeters: number, durationSeconds: number): number {
  if (distanceMeters <= 0) return 0;
  return durationSeconds / (distanceMeters / 1000);
}

/** 格式化为 mm:ss */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** 格式化配速 */
export function formatPace(paceSecPerKm: number): string {
  if (paceSecPerKm <= 0) return '--\'--"';
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.round(paceSecPerKm % 60);
  return `${m}'${s.toString().padStart(2, '"')}"`;
}

/** 简单哈希（非加密，用于去重） */
export function simpleHash(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
