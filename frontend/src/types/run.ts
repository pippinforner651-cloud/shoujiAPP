/* 跑步数据模型 */

import type { ActivitySource, DeviceInfo, ActivityType } from './activity';
import type { GpsPoint } from './gps';

/** 单条跑步记录（扩展：含来源、设备、GPS 轨迹） */
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
  /** 数据来源（扩展字段，V2.1） */
  source?: ActivitySource;
  /** 设备信息（扩展字段，V2.1） */
  device?: DeviceInfo;
  /** 运动类型（扩展字段，V2.1） */
  activityType?: ActivityType;
  /** 消耗热量（千卡，扩展字段，V2.1） */
  calories?: number;
  /** GPS 轨迹点（扩展字段，V2.2） */
  gpsTrack?: GpsPoint[];
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
