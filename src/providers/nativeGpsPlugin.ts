// ============================================================
// E23跑起来 · 原生GPS跑步插件 TypeScript 接口
// 通过Capacitor原生桥接调用Android Foreground Service
// React层不再使用 watchPosition，所有GPS采集由原生层管理
// ============================================================

import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface GpsRunPlugin {
  checkOutdoorReadiness(): Promise<OutdoorReadiness>;
  prepareOutdoorRun(): Promise<{ preparing: boolean; gpsEnabled: boolean; activityCreated: false }>;
  cancelPreparation(): Promise<void>;
  /** 开始跑步 → 启动Foreground Service + GPS */
  startRun(): Promise<{ clientActivityId: string; startTimeMs: number }>;

  /** 暂停跑步（暂停GPS但不停止Service） */
  pauseRun(): Promise<void>;

  /** 继续跑步（恢复GPS采集） */
  resumeRun(): Promise<void>;

  /** 结束跑步（停止Service + 通知） */
  stopRun(): Promise<Partial<RunSummaryResponse>>;
  abandonRun(): Promise<void>;

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

  /** 获取GPS诊断信息 */
  getDiagnostics(): Promise<DiagnosticsResponse>;

  /** 导出诊断日志文本 */
  exportDiagnosticLog(): Promise<{ log: string }>;

  addListener(eventName: 'locationUpdate', listener: (event: TrackPointResponse) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'statsUpdate', listener: (event: StatsResponse) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'serviceStateChange', listener: (event: { state: number; message: string }) => void): Promise<PluginListenerHandle>;
}

// ===== 类型定义 =====

export interface RunStateResponse {
  state: number;          // 0=IDLE, 1=RUNNING, 2=PAUSED, 3=PREPARING, 4=ABANDONED
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
  provider: string;
  calculatedSpeed: number;
  distanceDelta: number;
  riskFlag: string;
}

export interface OutdoorReadiness {
  fineLocationGranted: boolean;
  coarseLocationGranted: boolean;
  gpsEnabled: boolean;
  ready: boolean;
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
  riskPoints: number;
  serverUploadState: string;
}

export interface DiagnosticsResponse {
  phoneBrand: string;
  phoneModel: string;
  androidVersion: string;
  sdkVersion: number;
  serviceRunning: boolean;
  runState?: number;
  activityId?: string;
  startTimeMs?: number;
  totalDistanceM?: number;
  lastLocationCallbackMs?: number;
  lastSqliteWriteMs?: number;
  lastNotificationUpdateMs?: number;
  lastAccuracy?: number;
  validPoints?: number;
  rejectedPoints?: number;
  screenOff?: boolean;
  appBackgrounded?: boolean;
  lastError?: string;
  diagCount?: number;
  locationCallbackCount?: number;
  locationAcceptedCount?: number;
  locationRejectedCount?: number;
  sqliteWriteOk?: number;
  sqliteWriteFailed?: number;
  firstFixReceived?: boolean;
  distMode?: number;
}

// 注册插件
const GpsRun = registerPlugin<GpsRunPlugin>('GpsRun');

export default GpsRun;
