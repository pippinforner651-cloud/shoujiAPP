/* 统一运动数据模型 */

/** 数据来源 */
export type ActivitySource =
  | 'manual'
  | 'apple_health'
  | 'huawei_health'
  | 'garmin'
  | 'xiaomi'
  | 'wechat'
  | 'gps';

/** 运动类型 */
export type ActivityType = 'running' | 'walking' | 'cycling' | 'trail';

/** 设备信息 */
export interface DeviceInfo {
  /** 设备名称 */
  name: string;
  /** 设备型号 */
  model?: string;
  /** 操作系统 */
  os?: string;
}

/** GPS 轨迹点 */
export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  altitude?: number;
}

/** GPS 轨迹 */
export interface GpsTrack {
  points: GpsPoint[];
  totalDistanceKm?: number;
  startTime?: string;
  endTime?: string;
}

/** 统一运动记录（完整模型） */
export interface ActivityRecord {
  /** 唯一 ID */
  id: string;
  /** 用户 ID */
  userId: string;
  /** 数据来源 */
  source: ActivitySource;
  /** 设备信息（可选） */
  device?: DeviceInfo;
  /** 运动类型 */
  activityType: ActivityType;
  /** 距离（公里） */
  distanceKm: number;
  /** 时长（秒） */
  durationSec: number;
  /** 配速（秒/公里），自动计算 */
  paceSec: number;
  /** 消耗热量（千卡，可选） */
  calories?: number;
  /** 运动开始时间 */
  startTime: string;
  /** GPS 轨迹（可选） */
  gpsTrack?: GpsTrack;
  /** 记录创建时间 */
  createdAt: string;
  /** 可选备注 */
  note?: string;
}

/** 适配器输入（外部系统原始格式 → 此接口） */
export interface ExternalActivityInput {
  source: ActivitySource;
  device?: DeviceInfo;
  activityType: ActivityType;
  distanceKm: number;
  durationSec: number;
  calories?: number;
  startTime: string;
  gpsTrack?: GpsTrack;
  note?: string;
}
