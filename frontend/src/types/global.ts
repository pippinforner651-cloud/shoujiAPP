/* 多人环游数据模型 */

/** 单日跑量来源 */
export type RunSource = 'manual' | 'apple_watch' | 'garmin' | 'huawei_health' | 'keep';

/** 用户运动记录 */
export interface GlobalRunRecord {
  date: string;
  distanceKm: number;
  durationMin: number;
  source: RunSource;
}

/** 参与者摘要 */
export interface UserSummary {
  id: string;
  nickname: string;
  /** 头像 emoji */
  avatar: string;
  /** 跑步记录列表 */
  runRecords: GlobalRunRecord[];
  /** 个人总跑量（公里）— 从 runRecords reduce 计算 */
  totalRunKm: number;
  /** 虚拟推进公里 */
  virtualKm: number;
  /** 当前所在城市 */
  currentCity: string;
  /** 完成比例（0-100） */
  completionRate: number;
  /** 数据来源 */
  source: RunSource;
  /** 最近一次跑步日期 */
  lastRunDate: string;
}

/** 云端跑步记录（模拟从服务器获取） */
export interface RunRecordCloud {
  userId: string;
  date: string;
  distanceKm: number;
  durationMin: number;
  source: RunSource;
  syncedAt: string;
}

/** 全民进度 */
export interface GlobalProgress {
  /** 参与人数 */
  participantCount: number;
  /** 全民总真实跑量（公里）= 100人 totalRunKm 求和 */
  totalRealKm: number;
  /** 全民总虚拟推进（公里） */
  totalVirtualKm: number;
  /** 全民平均虚拟推进 = totalVirtualKm / participantCount */
  averageVirtualKm: number;
  /** 全民当前到达城市 */
  currentCity: string;
  /** 全民当前城市路线序号 */
  currentCityIndex: number;
  /** 全民完成比例 */
  completionRate: number;
  /** 所有跑者列表 */
  allRunners: UserSummary[];
}

/** localStorage 存储的全民快照 */
export interface GlobalSnapshot {
  version: number;
  cachedAt: string;
}
