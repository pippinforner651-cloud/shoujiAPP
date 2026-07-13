/* 运动分析数据模型 */

/** 配速分析 */
export interface PaceAnalysis {
  /** 平均配速（秒/公里） */
  averagePaceSec: number;
  /** 最快配速（秒/公里） */
  bestPaceSec: number;
  /** 最慢配速（秒/公里） */
  worstPaceSec: number;
  /** 配速标准差（衡量稳定度，越小越稳定） */
  paceStdDev: number;
}

/** 公里分段 */
export interface KmSplit {
  /** 分段索引（第X公里，从1开始） */
  km: number;
  /** 该公里耗时（秒） */
  durationSec: number;
  /** 该公里配速（秒/公里） */
  paceSec: number;
  /** 累计距离（公里） */
  cumulativeKm: number;
  /** 累计耗时（秒） */
  cumulativeSec: number;
}

/** 连续跑步记录 */
export interface StreakInfo {
  /** 当前连续跑步天数 */
  currentStreak: number;
  /** 最长连续跑步天数 */
  longestStreak: number;
  /** 连续跑步开始日期 */
  streakStartDate: string;
  /** 最近跑步日期 */
  lastRunDate: string;
}

/** 用户综合健身档案 */
export interface UserFitnessStats {
  /** 累计跑量（公里） */
  totalDistanceKm: number;
  /** 累计跑步次数 */
  runCount: number;
  /** 最长单次距离（公里） */
  longestRunKm: number;
  /** 最快配速（分钟/公里） */
  bestPace: number;
  /** 平均配速（分钟/公里） */
  averagePace: number;
  /** 当前连续跑步天数 */
  currentStreak: number;
  /** 最长连续跑步天数 */
  longestStreak: number;
  /** 最近一次跑步日期 */
  lastRunDate: string;
}
