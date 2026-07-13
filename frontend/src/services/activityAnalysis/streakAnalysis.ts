/**
 * 连续跑步天数分析
 *
 * 基于 RunRecord 的日期计算连续跑步次数。
 */
import type { RunRecord } from '../../types/run';
import type { StreakInfo } from '../../types/analysis';

/** 分析连续跑步记录 */
export function analyzeStreak(records: RunRecord[]): StreakInfo {
  const dates = [...new Set(records.map((r) => r.date))].sort();

  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, streakStartDate: '', lastRunDate: '' };
  }

  const lastDate = dates[dates.length - 1];
  const today = new Date().toISOString().slice(0, 10);

  // 计算当前连续天数（从今天向前数）
  let currentStreak = 0;
  const checkDate = new Date(today);

  while (dates.includes(checkDate.toISOString().slice(0, 10)) || currentStreak === 0) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (dates.includes(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (currentStreak === 0) {
      // 今天没跑，检查昨天
      checkDate.setDate(checkDate.getDate() - 1);
      if (!dates.includes(checkDate.toISOString().slice(0, 10))) {
        break; // 昨天也没跑 → 连续为0
      }
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 计算最长连续
  let longestStreak = 0;
  let tempStreak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // 连续跑步开始日期
  const lastIdx = dates.indexOf(lastDate);
  const streakStartIdx = lastIdx - currentStreak + 1;
  const streakStartDate = streakStartIdx >= 0 && streakStartIdx < dates.length ? dates[streakStartIdx] : '';

  return {
    currentStreak,
    longestStreak,
    streakStartDate,
    lastRunDate: lastDate,
  };
}
