import { useRunStore } from '../../store/runStore';
import { useAchievementStore } from '../../store/achievementStore';
import { getRouteData } from '../../data/routeLoader';
import { analyzeStreak } from '../../services/activityAnalysis/streakAnalysis';

export default function MonthlyReport() {
  const { records, stats } = useRunStore();
  const { level } = useAchievementStore();
  const { nodes } = getRouteData();
  const streak = analyzeStreak(records);

  // 本月数据
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthRecords = records.filter((r) => r.date.startsWith(monthKey));
  const monthKm = monthRecords.reduce((s, r) => s + r.distanceKm, 0);
  const monthCount = monthRecords.length;
  const bestPace = monthRecords.length > 0
    ? Math.min(...monthRecords.filter((r) => r.pace > 0).map((r) => r.pace))
    : 0;

  const virtualKm = monthKm * 10;
  const reachedCities = nodes.filter((n) => virtualKm >= n.totalDistanceKm);
  const bestRoute = reachedCities.length >= 2
    ? `${reachedCities[0]?.city || '深圳'}→${reachedCities[reachedCities.length - 1]?.city || '厦门'}`
    : '暂无';

  const formatPace = (min: number) => {
    if (min <= 0) return '--\'--"';
    const m = Math.floor(min);
    const s = Math.round((min - m) * 60);
    return `${m}'${s.toString().padStart(2, '0')}"`;
  };

  if (monthCount === 0) {
    return (
      <div className="mp-section">
        <div className="mp-section-title">📊 {monthKey} 运动报告</div>
        <div className="mp-empty">本月暂无运动记录</div>
      </div>
    );
  }

  return (
    <div className="mp-section mp-report">
      <div className="mp-section-title">📊 {monthKey} 运动报告</div>
      <div className="mr-grid">
        <div className="mr-item main">
          <div className="mr-val">{monthKm.toFixed(1)}</div>
          <div className="mr-label">本月跑量 (km)</div>
        </div>
        <div className="mr-item">
          <div className="mr-val">{monthCount}</div>
          <div className="mr-label">跑步次数</div>
        </div>
        <div className="mr-item">
          <div className="mr-val">{formatPace(bestPace)}</div>
          <div className="mr-label">最佳配速</div>
        </div>
        <div className="mr-item">
          <div className="mr-val">{bestRoute}</div>
          <div className="mr-label">最远路线</div>
        </div>
      </div>
      <div className="mr-bottom">
        <span>累计 {stats.totalDistanceKm.toFixed(0)} km · Lv.{level.level} {level.title}</span>
        {streak.currentStreak >= 3 && <span className="mr-streak">🔥 连续{streak.currentStreak}天</span>}
      </div>
    </div>
  );
}
