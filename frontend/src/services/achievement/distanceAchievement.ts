/**
 * 里程类成就检测
 */
import type { Achievement, UserAchievement } from '../../types/achievement';

export function checkDistanceAchievements(
  achievements: Achievement[],
  totalKm: number
): UserAchievement[] {
  return achievements
    .filter((a) => a.category === 'distance')
    .map((a) => {
      const threshold = a.condition.threshold;
      const progress = Math.min(1, totalKm / threshold);
      return {
        achievementId: a.id,
        unlocked: totalKm >= threshold,
        unlockedAt: totalKm >= threshold ? new Date().toISOString() : undefined,
        progress,
        progressText: `${Math.round(totalKm)} / ${threshold} km`,
      };
    });
}
