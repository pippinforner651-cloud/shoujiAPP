/**
 * 城市解锁类成就检测
 */
import type { Achievement, UserAchievement } from '../../types/achievement';

export function checkCityAchievements(
  achievements: Achievement[],
  unlockedCities: number
): UserAchievement[] {
  return achievements
    .filter((a) => a.category === 'city')
    .map((a) => {
      const threshold = a.condition.threshold;
      const progress = Math.min(1, unlockedCities / threshold);
      return {
        achievementId: a.id,
        unlocked: unlockedCities >= threshold,
        unlockedAt: unlockedCities >= threshold ? new Date().toISOString() : undefined,
        progress,
        progressText: `${unlockedCities} / ${threshold} 城市`,
      };
    });
}
