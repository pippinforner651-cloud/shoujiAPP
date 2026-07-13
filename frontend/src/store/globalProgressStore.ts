/**
 * 全民进度 Store
 *
 * 数据来源：
 * - 离线模式：100 名模拟用户的 runRecords 累加
 * - 在线模式：GET /v1/leaderboard 获取真实排行榜数据
 *
 * 总跑量 = 所有用户 totalRunKm 的 reduce 求和。
 * 与个人 runStore 完全解耦。
 */

import { create } from 'zustand';
import { generateMockRunners } from '../mock/globalRunners';
import { get } from '../services/cloud/apiClient';
import type { GlobalProgress, UserSummary } from '../types/global';
import { SCALE_RATIO } from '../types/progress';

/** 定位全民城市 */
function locateGlobalCity(averageVirtualKm: number): { city: string; index: number } {
  if (averageVirtualKm <= 0) return { city: '深圳', index: 0 };
  const distances = [
    0, 570, 830, 1150, 1410, 1630, 1930, 2470, 2980, 3460, 4600, 4730,
    5414, 5680, 5963, 6263, 6763, 6963, 7993, 8643, 8823, 9373, 9813,
    10033, 10373, 10983, 11403, 12003, 12483, 13033, 13503, 13763, 14863,
    15963, 16233, 16633, 17633, 17813, 17993, 18323, 18833, 19233, 19623,
    19853, 20103, 20403, 20863, 21283,
  ];
  const cities = [
    '深圳', '厦门', '福州', '温州', '宁波', '上海', '南京', '武汉',
    '郑州', '西安', '天津', '北京', '沈阳', '长春', '哈尔滨', '齐齐哈尔',
    '呼伦贝尔', '满洲里', '锡林浩特', '呼和浩特', '包头', '银川', '兰州',
    '西宁', '张掖', '敦煌', '哈密', '乌鲁木齐', '库尔勒', '阿克苏',
    '喀什', '叶城', '阿里（狮泉河）', '日喀则', '拉萨', '林芝',
    '香格里拉', '丽江', '大理', '昆明', '贵阳', '桂林', '南宁',
    '北海', '海口', '三亚', '湛江', '广州',
  ];
  for (let i = distances.length - 1; i >= 0; i--) {
    if (averageVirtualKm >= distances[i]) return { city: cities[i] || '广州', index: i };
  }
  return { city: '深圳', index: 0 };
}

/** 计算全民进度 — 所有数据从 runners reduce 推导 */
function computeGlobalProgress(runners: UserSummary[]): GlobalProgress {
  // 总真实跑量 = 所有用户跑量求和
  const totalReal = runners.reduce((s, r) => s + r.totalRunKm, 0);
  const totalVirtual = totalReal * SCALE_RATIO;
  const avgVirtual = runners.length > 0 ? totalVirtual / runners.length : 0;
  const compRate = Math.min(100, (avgVirtual / 21423) * 100);
  const location = locateGlobalCity(avgVirtual);

  return {
    participantCount: runners.length,
    totalRealKm: Math.round(totalReal * 100) / 100,
    totalVirtualKm: Math.round(totalVirtual),
    averageVirtualKm: Math.round(avgVirtual),
    currentCity: location.city,
    currentCityIndex: location.index,
    completionRate: Math.round(compRate * 100) / 100,
    allRunners: runners,
  };
}

/* ===== 从后端获取排行榜 ===== */

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  nickname: string;
  avatar: string;
  total_distance_km: number;
  run_count: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total_participants: number;
  global_total_km: number;
}

async function tryFetchFromBackend(): Promise<GlobalProgress | null> {
  try {
    const res = await get<LeaderboardResponse>('/leaderboard?limit=100');
    if (!res.success || !res.data || res.data.total_participants <= 0) return null;

    const { leaderboard, total_participants, global_total_km } = res.data;
    const totalVirtual = global_total_km * SCALE_RATIO;
    const avgVirtual = total_participants > 0 ? totalVirtual / total_participants : 0;
    const location = locateGlobalCity(avgVirtual);

    // 构造 UserSummary 列表
    const runners: UserSummary[] = leaderboard.map((entry) => ({
      id: entry.user_id,
      nickname: entry.nickname,
      avatar: entry.avatar || '🏃',
      runRecords: [],
      totalRunKm: entry.total_distance_km,
      virtualKm: Math.round(entry.total_distance_km * SCALE_RATIO),
      currentCity: '',
      completionRate: 0,
      source: 'manual',
      lastRunDate: '',
    }));

    return {
      participantCount: total_participants,
      totalRealKm: Math.round(global_total_km * 100) / 100,
      totalVirtualKm: Math.round(totalVirtual),
      averageVirtualKm: Math.round(avgVirtual),
      currentCity: location.city,
      currentCityIndex: location.index,
      completionRate: Math.min(100, (avgVirtual / 21423) * 100),
      allRunners: runners,
    };
  } catch {
    return null;
  }
}

/* ===== Store ===== */

interface GlobalState {
  progress: GlobalProgress;
  runners: UserSummary[];
  initialized: boolean;

  initialize: () => void;
  refresh: () => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  progress: {
    participantCount: 0, totalRealKm: 0, totalVirtualKm: 0,
    averageVirtualKm: 0, currentCity: '深圳', currentCityIndex: 0,
    completionRate: 0, allRunners: [],
  },
  runners: [],
  initialized: false,

  initialize: async () => {
    const state = useGlobalStore.getState();
    if (state.initialized) return;

    // 优先从后端获取真实数据
    const backendProgress = await tryFetchFromBackend();
    if (backendProgress) {
      set({ progress: backendProgress, runners: backendProgress.allRunners, initialized: true });
      return;
    }

    // 后端不可用，回退到 Mock
    const runners = generateMockRunners();
    const progress = computeGlobalProgress(runners);
    set({ runners, progress, initialized: true });
  },

  refresh: async () => {
    const backendProgress = await tryFetchFromBackend();
    if (backendProgress) {
      set({ progress: backendProgress, runners: backendProgress.allRunners });
      return;
    }
    set((state) => ({
      progress: computeGlobalProgress(state.runners),
    }));
  },
}));
