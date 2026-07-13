/**
 * 路线推进 Store
 *
 * 职责：
 * - 监听 runStore 的跑量变化
 * - 计算虚拟公里 → 定位到路线城市
 * - 统计完成度
 * - 自动同步 localStorage（进度快照）
 */

import { create } from 'zustand';
import { useRunStore } from './runStore';
import { getRouteData } from '../data/routeLoader';
import { SCALE_RATIO } from '../types/progress';
import type { ProgressInfo, ProgressSnapshot } from '../types/progress';
import { PROGRESS_STORAGE_KEY, PROGRESS_STORAGE_VERSION } from '../types/progress';
import type { RouteNode } from '../types/route';

/* ===== 路线定位算法 ===== */

/**
 * 根据虚拟公里定位到路线上的位置
 *
 * 算法说明：
 * 1. 遍历 48 个城市节点，每个节点有 total_distance_km（累计虚拟公里）
 * 2. 找到最后一个 total_distance_km <= virtualKm 的节点 → 当前城市
 * 3. 下一个节点 → 下一站
 * 4. 如果 virtualKm < 0 → 深圳（起点）
 * 5. 如果 virtualKm >= 总里程 → 已完成全程
 */
function locateOnRoute(virtualKm: number): {
  currentCity: RouteNode | null;
  currentRouteIndex: number;
  currentCityVirtualKm: number;
  nextCity: RouteNode | null;
  remainingToNextKm: number;
  headingToCity: string;
} {
  const { nodes, meta } = getRouteData();

  if (nodes.length === 0) {
    return {
      currentCity: null,
      currentRouteIndex: 0,
      currentCityVirtualKm: 0,
      nextCity: null,
      remainingToNextKm: 0,
      headingToCity: '数据加载中',
    };
  }

  // 处理特殊情况
  if (virtualKm <= 0) {
    return {
      currentCity: nodes[0],
      currentRouteIndex: 1,
      currentCityVirtualKm: 0,
      nextCity: nodes.length > 1 ? nodes[1] : null,
      remainingToNextKm: nodes[0].nextDistanceKm,
      headingToCity: nodes.length > 1 ? nodes[1].city : nodes[0].city,
    };
  }

  if (virtualKm >= meta.totalDistanceKm) {
    const last = nodes[nodes.length - 1];
    return {
      currentCity: last,
      currentRouteIndex: nodes.length,
      currentCityVirtualKm: meta.totalDistanceKm,
      nextCity: null,
      remainingToNextKm: 0,
      headingToCity: '🏆 已完成全程！',
    };
  }

  // 正常定位：找到最后一个 totalDistanceKm <= virtualKm 的节点
  let currentIndex = 0;
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].totalDistanceKm <= virtualKm) {
      currentIndex = i;
      break;
    }
  }

  const current = nodes[currentIndex];
  const next = currentIndex < nodes.length - 1 ? nodes[currentIndex + 1] : null;

  const remaining = next
    ? Math.max(0, next.totalDistanceKm - virtualKm)
    : 0;

  return {
    currentCity: current,
    currentRouteIndex: current.order,
    currentCityVirtualKm: current.totalDistanceKm,
    nextCity: next,
    remainingToNextKm: remaining,
    headingToCity: next ? next.city : '🏆 已完成全程！',
  };
}

/* ===== localStorage ===== */

function loadSnapshot(): ProgressSnapshot | null {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProgressSnapshot;
    return parsed.version === PROGRESS_STORAGE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function saveSnapshot(lastVirtualKm: number, lastCityIndex: number): void {
  try {
    const snap: ProgressSnapshot = {
      version: PROGRESS_STORAGE_VERSION,
      lastVirtualKm,
      lastCityIndex,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(snap));
  } catch {
    // silent
  }
}

/* ===== 计算完整 ProgressInfo ===== */

function computeProgress(realKm: number): ProgressInfo {
  const virtualKm = realKm * SCALE_RATIO;
  const { meta } = getRouteData();
  const totalVirtual = meta.totalDistanceKm;

  const location = locateOnRoute(virtualKm);

  return {
    realKm: Math.round(realKm * 100) / 100,
    virtualKm: Math.round(virtualKm * 100) / 100,
    totalVirtualKm: totalVirtual,
    completionRate: totalVirtual > 0
      ? Math.min(100, Math.round((virtualKm / totalVirtual) * 10000) / 100)
      : 0,

    currentCity: location.currentCity,
    currentRouteIndex: location.currentRouteIndex,
    currentCityVirtualKm: location.currentCityVirtualKm,

    nextCity: location.nextCity,
    remainingToNextKm: Math.round(location.remainingToNextKm * 100) / 100,
    remainingToNextRealKm: Math.round((location.remainingToNextKm / SCALE_RATIO) * 100) / 100,

    headingToCity: location.headingToCity,
  };
}

/* ===== Store ===== */

interface ProgressStoreState {
  info: ProgressInfo;
  initialized: boolean;
  initialize: () => void;
  refresh: () => void;
}

export const useProgressStore = create<ProgressStoreState>((set) => ({
  info: computeProgress(0),
  initialized: false,

  initialize: () => {
    // 从 localStorage 恢复快照
    const snap = loadSnapshot();
    const initialReal = snap
      ? snap.lastVirtualKm / SCALE_RATIO
      : useRunStore.getState().stats.totalDistanceKm;

    const info = computeProgress(initialReal);
    set({ info, initialized: true });
  },

  refresh: () => {
    const realKm = useRunStore.getState().stats.totalDistanceKm;
    const info = computeProgress(realKm);

    // 保存快照
    saveSnapshot(info.virtualKm, info.currentRouteIndex);

    set({ info });
  },
}));

/**
 * 订阅 runStore 变化，自动刷新 progressStore
 * 在应用初始化时调用一次
 */
let _subscribed = false;
export function subscribeProgress(): void {
  if (_subscribed) return;
  _subscribed = true;

  useRunStore.subscribe((state) => {
    // 只在 stats 变化时触发
    if (state.stats.totalDistanceKm !== undefined) {
      useProgressStore.getState().refresh();
    }
  });
}
