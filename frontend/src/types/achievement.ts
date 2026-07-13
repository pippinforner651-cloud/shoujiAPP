/* 成就与等级系统类型 */

/** 成就类型 */
export type AchievementCategory = 'distance' | 'city' | 'streak' | 'special';

/** 成就条件 */
export interface AchievementCondition {
  /** 条件类型 */
  type: 'total_km' | 'city_unlock' | 'streak_days' | 'special';
  /** 阈值（公里/天数/城市数） */
  threshold: number;
  /** 条件目标标识（城市类需要） */
  target?: string;
}

/** 成就定义 */
export interface Achievement {
  /** 唯一 ID */
  id: string;
  /** 成就名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 图标 emoji */
  icon: string;
  /** 成就类型 */
  category: AchievementCategory;
  /** 解锁条件 */
  condition: AchievementCondition;
  /** 经验值奖励 */
  xpReward: number;
}

/** 用户成就状态 */
export interface UserAchievement {
  /** 成就 ID */
  achievementId: string;
  /** 是否已解锁 */
  unlocked: boolean;
  /** 解锁时间 */
  unlockedAt?: string;
  /** 当前进度（0-1） */
  progress: number;
  /** 进度文本 */
  progressText: string;
}

/** 用户等级 */
export interface UserLevel {
  /** 当前等级 */
  level: number;
  /** 当前经验值 */
  currentXp: number;
  /** 升到下一级所需经验 */
  nextLevelXp: number;
  /** 总经验值 */
  totalXp: number;
  /** 等级名称 */
  title: string;
}

/* ===== 预定义成就列表 ===== */

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // === 里程类 ===
  { id: 'dist_10', name: '起步', description: '累计跑步 10 公里', icon: '👟', category: 'distance', condition: { type: 'total_km', threshold: 10 }, xpReward: 10 },
  { id: 'dist_42', name: '马拉松入门', description: '累计跑步 42.195 公里', icon: '🏅', category: 'distance', condition: { type: 'total_km', threshold: 42.195 }, xpReward: 50 },
  { id: 'dist_100', name: '百里跑者', description: '累计跑步 100 公里', icon: '🏆', category: 'distance', condition: { type: 'total_km', threshold: 100 }, xpReward: 100 },
  { id: 'dist_500', name: '长途旅者', description: '累计跑步 500 公里', icon: '🚀', category: 'distance', condition: { type: 'total_km', threshold: 500 }, xpReward: 300 },
  { id: 'dist_1000', name: '千里马', description: '累计跑步 1000 公里', icon: '🦄', category: 'distance', condition: { type: 'total_km', threshold: 1000 }, xpReward: 500 },
  { id: 'dist_5000', name: '环游中国', description: '累计跑步 5000 公里', icon: '🌏', category: 'distance', condition: { type: 'total_km', threshold: 5000 }, xpReward: 1000 },

  // === 城市类 ===
  { id: 'city_1', name: '出发', description: '离开深圳到达第一个城市', icon: '🚩', category: 'city', condition: { type: 'city_unlock', threshold: 1 }, xpReward: 20 },
  { id: 'city_10', name: '探索者', description: '解锁 10 个城市', icon: '🔍', category: 'city', condition: { type: 'city_unlock', threshold: 10 }, xpReward: 100 },
  { id: 'city_20', name: '旅行达人', description: '解锁 20 个城市', icon: '🧭', category: 'city', condition: { type: 'city_unlock', threshold: 20 }, xpReward: 200 },
  { id: 'city_35', name: '半程勇士', description: '解锁 35 个城市（过半）', icon: '⚔️', category: 'city', condition: { type: 'city_unlock', threshold: 35 }, xpReward: 500 },
  { id: 'city_48', name: '环游达人', description: '解锁全部 48 个城市', icon: '👑', category: 'city', condition: { type: 'city_unlock', threshold: 48 }, xpReward: 1000 },

  // === 连续类 ===
  { id: 'streak_3', name: '三天打鱼', description: '连续跑步 3 天', icon: '🐟', category: 'streak', condition: { type: 'streak_days', threshold: 3 }, xpReward: 30 },
  { id: 'streak_7', name: '一周达人', description: '连续跑步 7 天', icon: '📅', category: 'streak', condition: { type: 'streak_days', threshold: 7 }, xpReward: 70 },
  { id: 'streak_14', name: '两周坚持', description: '连续跑步 14 天', icon: '💪', category: 'streak', condition: { type: 'streak_days', threshold: 14 }, xpReward: 150 },
  { id: 'streak_30', name: '月跑者', description: '连续跑步 30 天', icon: '🌙', category: 'streak', condition: { type: 'streak_days', threshold: 30 }, xpReward: 300 },
  { id: 'streak_100', name: '百天跑者', description: '连续跑步 100 天', icon: '⭐', category: 'streak', condition: { type: 'streak_days', threshold: 100 }, xpReward: 1000 },
];

/* ===== 等级规则 ===== */

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: '跑步新手' },
  { level: 2, xp: 50, title: '跑步学徒' },
  { level: 3, xp: 150, title: '跑步爱好者' },
  { level: 4, xp: 300, title: '跑步达人' },
  { level: 5, xp: 500, title: '跑步高手' },
  { level: 6, xp: 800, title: '跑步强者' },
  { level: 7, xp: 1200, title: '跑步精英' },
  { level: 8, xp: 1800, title: '跑步大师' },
  { level: 9, xp: 2500, title: '跑步宗师' },
  { level: 10, xp: 3500, title: '跑步传奇' },
  { level: 11, xp: 5000, title: '环游圣者' },
  { level: 12, xp: 7000, title: '跑步之神' },
];

export function getLevel(xp: number): UserLevel {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) {
      level = LEVEL_THRESHOLDS[i].level;
      break;
    }
  }

  const current = LEVEL_THRESHOLDS.find((t) => t.level === level) || LEVEL_THRESHOLDS[0];
  const next = LEVEL_THRESHOLDS.find((t) => t.level === level + 1);

  return {
    level,
    currentXp: xp - current.xp,
    nextLevelXp: next ? next.xp - current.xp : Infinity,
    totalXp: xp,
    title: current.title,
  };
}
