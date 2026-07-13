/* 跑步数据模型 */

import type { ActivitySource, VerificationStatus } from './activity';

/** 单条跑步记录（Phase 6.3 扩展） */
export interface RunRecord {
  /** 唯一 ID */
  id: string;
  /** 跑步日期（YYYY-MM-DD） */
  date: string;
  /** 跑步距离（公里） */
  distanceKm: number;
  /** 跑步时长（分钟） */
  durationMin: number;
  /** 配速（分钟/公里），由 durationMin / distanceKm 计算得出 */
  pace: number;
  /** 记录创建时间（ISO 8601） */
  createdAt: string;
  /** 可选备注 */
  note?: string;
  /** 数据来源（Phase 6.3 扩展 9 种） */
  source?: ActivitySource;
  /** 运动类型 */
  sportType?: string;
  /** 消耗热量（千卡） */
  calories?: number;
  /** GPS 轨迹点 */
  gpsTrack?: Array<{ latitude: number; longitude: number; timestamp: string; altitude?: number; speed?: number }>;

  /* Phase 6.3 新增字段 */
  /** 运动时长（秒，替代 durationMin 的精确值） */
  durationSec?: number;
  /** 平均心率 */
  avgHeartRate?: number;
  /** 最大心率 */
  maxHeartRate?: number;
  /** 累计爬升（米） */
  elevationGain?: number;
  /** 设备名称 */
  deviceName?: string;
  /** 数据可信度 */
  verificationStatus?: VerificationStatus;
  /** 去重哈希 */
  rawDataHash?: string;
  /** 是否已同步到云端 */
  synced?: boolean;
  /** 是否离线缓存的记录（未联网时创建的） */
  offline?: boolean;
  /** 同步失败重试次数 */
  retryCount?: number;
  /** 上次同步尝试时间 */
  lastSyncAttempt?: string;
}

/** 跑步统计数据摘要 */
export interface RunStats {
  /** 总跑步次数 */
  totalRuns: number;
  /** 累计跑步距离（公里） */
  totalDistanceKm: number;
  /** 累计跑步时长（分钟） */
  totalDurationMin: number;
  /** 平均配速（分钟/公里） */
  averagePace: number;
  /** 平均单次距离（公里） */
  averageDistanceKm: number;
  /** 最远单次距离（公里） */
  longestRunKm: number;
  /** 最近一次跑步日期 */
  lastRunDate: string | null;
  /** 首次跑步日期 */
  firstRunDate: string | null;
}

/** localStorage 存储结构 */
export interface RunStorage {
  /** 版本号，用于数据迁移 */
  version: number;
  /** 所有跑步记录 */
  records: RunRecord[];
}

/** 存储键名 */
export const STORAGE_KEY = 'vr_china_run_v1';
export const STORAGE_VERSION = 3; // V3: 云同步合并标记
