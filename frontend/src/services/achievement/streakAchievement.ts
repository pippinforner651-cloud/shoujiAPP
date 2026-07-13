/**
 * 连续跑步类成就检测
 */
import type { Achievement, UserAchievement } from '../../types/achievement';

export function checkStreakAchievements(
  achievements: Achievement[],
  streakDays: number
): UserAchievement[] {
  return achievements
    .filter((a) => a.category === 'streak')
    .map((a) => {
      const threshold = a.condition.threshold;
      const progress = Math.min(1, streakDays / threshold);
      return {
        achievementId: a.id,
        unlocked: streakDays >= threshold,
        unlockedAt: streakDays >= threshold ? new Date().toISOString() : undefined,
        progress,
        progressText: `${streakDays} / ${threshold} 天`,
      };
    });
}
