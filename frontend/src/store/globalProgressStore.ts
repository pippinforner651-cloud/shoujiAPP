/**
 * V1/V2多人进度的诚实兼容Store。
 *
 * V1继续读取既有真实排行榜并保留冻结的1:10规则；V2只有在显式配置
 * v2-backend模式和活动ID后才会调用新接口。任何失败都不会回退到模拟跑者。
 */

import { create } from 'zustand';
import { MULTIPLAYER_MODE, V2_EVENT_ID, type MultiplayerMode } from '../config/multiplayer.ts';
import type { EventProgressView, EventRankingDto } from '../services/cloud/eventCore.ts';
import type { GlobalProgress, UserSummary } from '../types/global.ts';
import { SCALE_RATIO } from '../types/progress.ts';

export type GlobalLoadStatus = 'idle' | 'loading' | 'ready' | 'disabled' | 'error';

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  nickname: string;
  avatar: string;
  total_distance_km: number;
  run_count: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total_participants: number;
  global_total_km: number;
}

export interface GlobalProgressLoaders {
  loadV1Leaderboard(): Promise<LeaderboardResponse>;
  locateV1Average(actualDistanceKm: number): Promise<{
    virtualDistanceKm: number;
    currentCity: string;
    currentCityIndex: number;
    progressPercent: number;
  }>;
  loadV2Progress(eventId: string): Promise<EventProgressView>;
  loadV2Ranking(eventId: string): Promise<EventRankingDto>;
}

export interface GlobalLoadResult {
  status: Exclude<GlobalLoadStatus, 'idle' | 'loading'>;
  progress: GlobalProgress;
  error: string | null;
}

export const EMPTY_GLOBAL_PROGRESS: GlobalProgress = {
  participantCount: 0,
  totalRealKm: 0,
  totalVirtualKm: 0,
  averageVirtualKm: 0,
  currentCity: '深圳',
  currentCityIndex: 0,
  completionRate: 0,
  allRunners: [],
};

const defaultLoaders: GlobalProgressLoaders = {
  async loadV1Leaderboard() {
    const { get } = await import('../services/cloud/apiClient.ts');
    const response = await get<LeaderboardResponse>('/leaderboard?limit=100');
    if (!response.success || !response.data) throw new Error(response.error || 'V1多人服务暂不可用');
    return response.data;
  },
  async locateV1Average(actualDistanceKm) {
    const [{ getRouteData }, { calculateRouteProgress }] = await Promise.all([
      import('../data/routeLoader.ts'),
      import('../utils/routeProgress.ts'),
    ]);
    const progress = calculateRouteProgress(actualDistanceKm);
    const route = getRouteData();
    return {
      virtualDistanceKm: progress.virtualDistanceKm,
      currentCity: progress.currentCity ?? route.meta.startCity,
      currentCityIndex: progress.currentNode
        ? Math.max(0, route.nodes.findIndex((node) => node.id === progress.currentNode?.id))
        : 0,
      progressPercent: progress.progressPercent,
    };
  },
  async loadV2Progress(eventId) {
    const { loadEventProgress } = await import('../services/cloud/eventService.ts');
    return loadEventProgress(eventId);
  },
  async loadV2Ranking(eventId) {
    const { loadEventRanking } = await import('../services/cloud/eventService.ts');
    return loadEventRanking(eventId);
  },
};

async function mapV1Progress(response: LeaderboardResponse, loaders: GlobalProgressLoaders): Promise<GlobalProgress> {
  const participants = Number.isFinite(response.total_participants)
    ? Math.max(0, Math.round(response.total_participants))
    : 0;
  const totalRealKm = Number.isFinite(response.global_total_km) ? Math.max(0, response.global_total_km) : 0;
  const averageActualKm = participants > 0 ? totalRealKm / participants : 0;
  const routeProgress = await loaders.locateV1Average(averageActualKm);
  const runners: UserSummary[] = (Array.isArray(response.leaderboard) ? response.leaderboard : []).map((entry) => ({
    id: entry.user_id,
    nickname: entry.nickname,
    avatar: entry.avatar || 'default',
    runRecords: [],
    totalRunKm: entry.total_distance_km,
    virtualKm: Math.round(entry.total_distance_km * SCALE_RATIO),
    currentCity: '',
    completionRate: 0,
    source: 'manual',
    lastRunDate: '',
  }));

  return {
    participantCount: participants,
    totalRealKm: Math.round(totalRealKm * 100) / 100,
    totalVirtualKm: Math.round(totalRealKm * SCALE_RATIO),
    averageVirtualKm: Math.round(routeProgress.virtualDistanceKm),
    currentCity: routeProgress.currentCity,
    currentCityIndex: routeProgress.currentCityIndex,
    completionRate: Math.round(routeProgress.progressPercent * 100) / 100,
    allRunners: runners,
  };
}

function mapV2Progress(progress: EventProgressView, ranking: EventRankingDto): GlobalProgress {
  const runners: UserSummary[] = ranking.ranking.map((entry) => ({
    id: entry.user_id,
    nickname: entry.nickname,
    avatar: entry.avatar_url || 'default',
    runRecords: [],
    totalRunKm: entry.accepted_distance_meters / 1000,
    virtualKm: entry.accepted_distance_meters / 1000,
    currentCity: '',
    completionRate: 0,
    source: 'manual',
    lastRunDate: '',
  }));
  return {
    participantCount: progress.participantCount,
    totalRealKm: progress.acceptedKm,
    totalVirtualKm: progress.routeKm,
    averageVirtualKm: progress.routeKm,
    currentCity: '深圳',
    currentCityIndex: 0,
    completionRate: progress.progressPercent,
    allRunners: runners,
  };
}

export async function loadGlobalProgress(options: {
  mode: MultiplayerMode;
  eventId?: string;
  loaders?: GlobalProgressLoaders;
}): Promise<GlobalLoadResult> {
  const loaders = options.loaders ?? defaultLoaders;
  if (options.mode === 'disabled') {
    return { status: 'disabled', progress: EMPTY_GLOBAL_PROGRESS, error: '多人服务暂未启用' };
  }
  if (options.mode === 'v2-backend' && !options.eventId?.trim()) {
    return { status: 'disabled', progress: EMPTY_GLOBAL_PROGRESS, error: '多人服务暂未启用' };
  }

  try {
    if (options.mode === 'v1-backend') {
      return { status: 'ready', progress: await mapV1Progress(await loaders.loadV1Leaderboard(), loaders), error: null };
    }
    const eventId = options.eventId as string;
    const [progress, ranking] = await Promise.all([
      loaders.loadV2Progress(eventId),
      loaders.loadV2Ranking(eventId),
    ]);
    return { status: 'ready', progress: mapV2Progress(progress, ranking), error: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : '未知错误';
    return { status: 'error', progress: EMPTY_GLOBAL_PROGRESS, error: `数据加载失败：${detail}` };
  }
}

interface GlobalState {
  progress: GlobalProgress;
  runners: UserSummary[];
  initialized: boolean;
  status: GlobalLoadStatus;
  error: string | null;
  mode: MultiplayerMode;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
}

async function fetchConfiguredProgress(): Promise<GlobalLoadResult> {
  return loadGlobalProgress({ mode: MULTIPLAYER_MODE, eventId: V2_EVENT_ID });
}

export const useGlobalStore = create<GlobalState>((set, getState) => ({
  progress: EMPTY_GLOBAL_PROGRESS,
  runners: [],
  initialized: false,
  status: 'idle',
  error: null,
  mode: MULTIPLAYER_MODE,

  initialize: async () => {
    if (getState().initialized || getState().status === 'loading') return;
    set({ status: 'loading', error: null });
    const result = await fetchConfiguredProgress();
    set({
      progress: result.progress,
      runners: result.progress.allRunners,
      initialized: true,
      status: result.status,
      error: result.error,
    });
  },

  refresh: async () => {
    set({ status: 'loading', error: null });
    const result = await fetchConfiguredProgress();
    set({
      progress: result.progress,
      runners: result.progress.allRunners,
      initialized: true,
      status: result.status,
      error: result.error,
    });
  },
}));
