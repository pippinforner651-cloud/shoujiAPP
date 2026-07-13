/* 路线推进状态类型 */

import type { RouteNode } from './route';

/** 路线推进信息（由 progressStore 计算派生） */
export interface ProgressInfo {
  /** 当前真实跑步累计（km） */
  realKm: number;
  /** 当前虚拟路线推进（km）= realKm * 10 */
  virtualKm: number;
  /** 总虚拟里程（km） */
  totalVirtualKm: number;
  /** 完成百分比（0-100） */
  completionRate: number;

  /** 当前所在城市（可能为 null，表示尚未起步） */
  currentCity: RouteNode | null;
  /** 当前城市在路线中的序号（1-48，0=未起步） */
  currentRouteIndex: number;
  /** 当前城市累计虚拟公里 */
  currentCityVirtualKm: number;

  /** 下一站城市 */
  nextCity: RouteNode | null;
  /** 到达下一站还需的虚拟公里 */
  remainingToNextKm: number;
  /** 到达下一站还需的真实跑步公里 */
  remainingToNextRealKm: number;

  /** 下一站名称（用于显示 "正在前往XX"） */
  headingToCity: string;
}

/** 推进 store 状态 */
export interface ProgressState {
  /** 推进信息（派生数据） */
  info: ProgressInfo;
  /** 是否已初始化 */
  initialized: boolean;

  /** 初始化（从 runStore 同步） */
  initialize: () => void;
  /** 手动刷新（跑量变化时调用） */
  refresh: () => void;
}

/** localStorage 存储的推进快照 */
export interface ProgressSnapshot {
  version: number;
  lastVirtualKm: number;
  lastCityIndex: number;
  updatedAt: string;
}

export const PROGRESS_STORAGE_KEY = 'vr_china_progress_v1';
export const PROGRESS_STORAGE_VERSION = 1;
export const SCALE_RATIO = 10;
