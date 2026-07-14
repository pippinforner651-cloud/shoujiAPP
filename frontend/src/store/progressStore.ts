/**
 * 路线推进 Store：只负责订阅跑量和持久化。
 * 所有路线定位统一交给 utils/routeProgress 的唯一计算入口。
 */
import { create } from 'zustand';
import { getRouteData } from '../data/routeLoader';
import { calculateRouteProgress } from '../utils/routeProgress';
import { useRunStore } from './runStore';
import type { ProgressInfo, ProgressSnapshot } from '../types/progress';
import { PROGRESS_STORAGE_KEY, PROGRESS_STORAGE_VERSION } from '../types/progress';

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
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
      version: PROGRESS_STORAGE_VERSION,
      lastVirtualKm,
      lastCityIndex,
      updatedAt: new Date().toISOString(),
    } satisfies ProgressSnapshot));
  } catch {
    // localStorage 不可用时仍保持内存中的进度。
  }
}

function computeProgress(realKm: number): ProgressInfo {
  const routeProgress = calculateRouteProgress(realKm);
  const { nodes } = getRouteData();
  const findNode = (id: string | undefined) => nodes.find((node) => node.id === id) ?? null;
  const startNode = nodes[0] ?? null;
  const isClosureEndpoint = routeProgress.currentNode?.id === 'closure-endpoint';
  const currentCity = isClosureEndpoint ? startNode : findNode(routeProgress.currentNode?.id);
  const nextCity = routeProgress.nextNode?.id === 'closure-endpoint'
    ? startNode
    : findNode(routeProgress.nextNode?.id);
  const currentRouteIndex = routeProgress.isCompleted
    ? nodes.length
    : currentCity?.order ?? 0;

  return {
    realKm: Math.round(routeProgress.actualDistanceKm * 100) / 100,
    virtualKm: Math.round(routeProgress.virtualDistanceKm * 100) / 100,
    totalVirtualKm: routeProgress.totalRouteKm,
    completionRate: Math.round(routeProgress.progressPercent * 100) / 100,
    currentCity,
    currentRouteIndex,
    currentCityVirtualKm: routeProgress.isCompleted
      ? routeProgress.totalRouteKm
      : currentCity?.totalDistanceKm ?? 0,
    nextCity,
    remainingToNextKm: Math.round(routeProgress.distanceToNextCityKm * 100) / 100,
    remainingToNextRealKm: Math.round((routeProgress.distanceToNextCityKm / getRouteData().meta.scaleRatio) * 100) / 100,
    headingToCity: routeProgress.isCompleted
      ? '已完成全程'
      : routeProgress.nextCity ?? '数据加载中',
  };
}

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
    const snap = loadSnapshot();
    const initialRealKm = snap
      ? snap.lastVirtualKm / getRouteData().meta.scaleRatio
      : useRunStore.getState().stats.totalDistanceKm;
    set({ info: computeProgress(initialRealKm), initialized: true });
  },

  refresh: () => {
    const info = computeProgress(useRunStore.getState().stats.totalDistanceKm);
    saveSnapshot(info.virtualKm, info.currentRouteIndex);
    set({ info });
  },
}));

let subscribed = false;
export function subscribeProgress(): void {
  if (subscribed) return;
  subscribed = true;
  useRunStore.subscribe(() => {
    useProgressStore.getState().refresh();
  });
}
