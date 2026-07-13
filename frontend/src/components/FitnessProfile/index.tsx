import { useEffect, useState } from 'react';
import { useRunStore } from '../../store/runStore';
import { analyzePace, formatPaceMin } from '../../services/activityAnalysis/paceAnalysis';
import { analyzeStreak } from '../../services/activityAnalysis/streakAnalysis';
import type { UserFitnessStats } from '../../types/analysis';

export default function FitnessProfile() {
  const { records, initialize } = useRunStore();
  const [stats, setStats] = useState<UserFitnessStats | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (records.length === 0) return;

    const pace = analyzePace(records);
    const streak = analyzeStreak(records);

    setStats({
      totalDistanceKm: Math.round(records.reduce((s, r) => s + r.distanceKm, 0) * 100) / 100,
      runCount: records.length,
      longestRunKm: Math.max(...records.map((r) => r.distanceKm)),
      bestPace: pace.bestPaceSec / 60,
      averagePace: pace.averagePaceSec / 60,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastRunDate: streak.lastRunDate,
    });
  }, [records]);

  if (!stats || stats.runCount === 0) {
    return (
      <div className="fitness-card">
        <div className="fitness-title">💪 运动档案</div>
        <div className="fitness-empty">暂无运动记录，开始跑步吧！</div>
      </div>
    );
  }

  return (
    <div className="fitness-card">
      <div className="fitness-title">💪 运动档案</div>
      <div className="fitness-grid">
        <div className="fitness-item">
          <div className="fi-value">{stats.totalDistanceKm.toFixed(0)}</div>
          <div className="fi-label">累计公里</div>
        </div>
        <div className="fitness-item">
          <div className="fi-value">{stats.runCount}</div>
          <div className="fi-label">跑步次数</div>
        </div>
        <div className="fitness-item">
          <div className="fi-value">{stats.longestRunKm.toFixed(1)}</div>
          <div className="fi-label">最长距离</div>
        </div>
        <div className="fitness-item">
          <div className="fi-value">{formatPaceMin(stats.bestPace)}</div>
          <div className="fi-label">最快配速</div>
        </div>
        <div className="fitness-item">
          <div className="fi-value">{formatPaceMin(stats.averagePace)}</div>
          <div className="fi-label">平均配速</div>
        </div>
        <div className="fitness-item">
          <div className="fi-value">{stats.currentStreak}</div>
          <div className="fi-label">连续{stats.currentStreak > 0 ? '跑步' : ''}天</div>
        </div>
      </div>
    </div>
  );
}
