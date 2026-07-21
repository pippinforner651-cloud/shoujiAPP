// ============================================================
// E23跑起来 · 原生GPS跑步插件 TypeScript 接口
// 通过Capacitor原生桥接调用Android Foreground Service
// React层不再使用 watchPosition，所有GPS采集由原生层管理
// ============================================================

import { registerPlugin } from '@capacitor/core';

export interface GpsRunPlugin {
  /** 开始跑步 → 启动Foreground Service + GPS */
  startRun(): Promise<{ clientActivityId: string; startTimeMs: number }>;

  /** 暂停跑步（暂停GPS但不停止Service） */
  pauseRun(): Promise<void>;

  /** 继续跑步（恢复GPS采集） */
  resumeRun(): Promise<void>;

  /** 结束跑步（停止Service + 通知） */
  stopRun(): Promise<void>;

  /** 获取当前跑步状态 */
  getRunState(): Promise<RunStateResponse>;

  /** 获取当前统计（轻量版） */
  getCurrentStats(): Promise<StatsResponse>;

  /** 恢复未完成活动 - 检查SQLite中的未结束活动 */
  recoverActiveRun(): Promise<ActiveRunResponse>;

  /** 获取已完成活动列表 */
  listFinishedActivities(options: {
    limit?: number;
    offset?: number;
  }): Promise<{ activities: string }>;

  /** 加载指定活动的轨迹点 */
  loadActivityTrackPoints(options: {
    activityId: string;
    limit?: number;
    offset?: number;
  }): Promise<{ points: string; total: number }>;
}

// ===== 类型定义 =====

export interface RunStateResponse {
  state: number;          // 0=IDLE, 1=RUNNING, 2=PAUSED
  clientActivityId?: string;
  startTimeMs?: number;
  totalDistanceM?: number;
  totalMovingDurationMs?: number;
  totalPausedMs?: number;
  durationMs?: number;
  avgPace?: number;
  currentPace?: number;
  splitIndex?: number;
  splitDistanceM?: number;
  gpsPoints?: number;
  rejectedPoints?: number;
}

export interface StatsResponse {
  state: number;
  distanceM: number;
  durationMs: number;
  movingDurationMs: number;
  avgPace: number;
  currentPace: number;
  splitIndex: number;
  splitDistanceM: number;
  gpsPoints: number;
  rejectedPoints: number;
  rejectedPts: number;
}

export interface ActiveRunResponse {
  activeRun?: boolean;
  clientActivityId?: string;
  startTimeMs?: number;
  totalDistanceM?: number;
}

export interface TrackPointResponse {
  lat: number;
  lon: number;
  accuracy: number;
  altitude: number;
  speed: number;
  bearing: number;
  timestamp: number;
  accepted: boolean;
  rejectionReason: string;
  mock: boolean;
}

export interface RunSummaryResponse {
  clientActivityId: string;
  startTimeMs: number;
  endTimeMs: number;
  totalDistanceM: number;
  totalPausedMs: number;
  totalDurationMs: number;
  movingDurationMs: number;
  totalPoints: number;
  rejectedPoints: number;
  mockPoints: number;
  highSpeedPoints: number;
  serverUploadState: string;
}

// 注册插件
const GpsRun = registerPlugin<GpsRunPlugin>('GpsRun');

export default GpsRun;
