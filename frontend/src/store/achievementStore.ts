/**
 * 成就系统 Store
 *
 * 监听 runStore 和 cityStore 的变化，自动更新成就状态。
 * 成就数据持久化到 localStorage。
 */

import { create } from 'zustand';
import type { UserAchievement, UserLevel } from '../types/achievement';
import { ALL_ACHIEVEMENTS, getLevel } from '../types/achievement';
import { checkDistanceAchievements } from '../services/achievement/distanceAchievement';
import { checkCityAchievements } from '../services/achievement/cityAchievement';
import { checkStreakAchievements } from '../services/achievement/streakAchievement';
import { useRunStore } from './runStore';
import { useCityStore } from './cityStore';
import { analyzeStreak } from '../services/activityAnalysis/streakAnalysis';

const ACH_KEY = 'vr_china_achievement_v1';

interface AchievementStore {
  /** 所有成就状态 */
  userAchievements: UserAchievement[];
  /** 用户等级 */
  level: UserLevel;
  /** 总经验值 */
  totalXp: number;

  initialize: () => void;
  refresh: () => void;
}

/** 从 localStorage 加载已解锁成就的时间 */
function loadUnlockedAt(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ACH_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function saveUnlockedAt(record: Record<string, string>): void {
  try { localStorage.setItem(ACH_KEY, JSON.stringify(record)); } catch { /* ignore */ }
}

export const useAchievementStore = create<AchievementStore>((set) => ({
  userAchievements: [],
  level: getLevel(0),
  totalXp: 0,

  initialize: () => {
    const records = useRunStore.getState().records;
    const unlockedCities = useCityStore.getState().unlockedCities.length;
    const streak = analyzeStreak(records);
    const totalKm = records.reduce((s, r) => s + r.distanceKm, 0);

    // 检测所有成就
    const distA = checkDistanceAchievements(ALL_ACHIEVEMENTS, totalKm);
    const cityA = checkCityAchievements(ALL_ACHIEVEMENTS, unlockedCities);
    const streakA = checkStreakAchievements(ALL_ACHIEVEMENTS, streak.currentStreak);

    const allUserA = [...distA, ...cityA, ...streakA];

    // 恢复已解锁成就的时间戳
    const unlockedAt = loadUnlockedAt();
    for (const ua of allUserA) {
      if (ua.unlocked && unlockedAt[ua.achievementId]) {
        ua.unlockedAt = unlockedAt[ua.achievementId];
      } else if (ua.unlocked) {
        unlockedAt[ua.achievementId] = ua.unlockedAt!;
      }
    }
    saveUnlockedAt(unlockedAt);

    const xp = allUserA
      .filter((ua) => ua.unlocked)
      .reduce((sum, ua) => {
        const ach = ALL_ACHIEVEMENTS.find((a) => a.id === ua.achievementId);
        return sum + (ach?.xpReward || 0);
      }, 0);

    set({ userAchievements: allUserA, totalXp: xp, level: getLevel(xp) });
  },

  refresh: () => {
    // 重新计算
    const state = useAchievementStore.getState();
    state.initialize();
  },
}));
