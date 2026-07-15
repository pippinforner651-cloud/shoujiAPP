/**
 * 旧版多人界面的诚实兼容Store。
 *
 * V1曾在云端不可用时生成模拟跑者，并按人均虚拟公里定位。
 * V2正式数据模型建立后，该行为被永久禁止。新的E23活动界面将改用
 * eventService和真实活动ID；在接线完成前，本Store只返回空状态。
 */

import { create } from 'zustand';
import type { GlobalProgress, UserSummary } from '../types/global';

const EMPTY_GLOBAL_PROGRESS: GlobalProgress = {
  participantCount: 0,
  totalRealKm: 0,
  totalVirtualKm: 0,
  averageVirtualKm: 0,
  currentCity: '深圳',
  currentCityIndex: 0,
  completionRate: 0,
  allRunners: [],
};

interface GlobalState {
  progress: GlobalProgress;
  runners: UserSummary[];
  initialized: boolean;
  status: 'idle' | 'unavailable';
  initialize: () => void;
  refresh: () => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  progress: EMPTY_GLOBAL_PROGRESS,
  runners: [],
  initialized: false,
  status: 'idle',

  initialize: () => {
    set({
      progress: EMPTY_GLOBAL_PROGRESS,
      runners: [],
      initialized: true,
      status: 'unavailable',
    });
  },

  refresh: () => {
    set({
      progress: EMPTY_GLOBAL_PROGRESS,
      runners: [],
      status: 'unavailable',
    });
  },
}));
