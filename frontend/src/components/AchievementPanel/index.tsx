import { useEffect } from 'react';
import { useAchievementStore } from '../../store/achievementStore';
import { ALL_ACHIEVEMENTS } from '../../types/achievement';

export default function AchievementPanel() {
  const { userAchievements, level, initialize } = useAchievementStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const unlocked = userAchievements.filter((a) => a.unlocked);
  const locked = userAchievements.filter((a) => !a.unlocked);
  const pct = Math.min(100, (level.currentXp / level.nextLevelXp) * 100);
  const nextLevelText = level.nextLevelXp === Infinity ? 'MAX' : `${level.currentXp} / ${level.nextLevelXp}`;

  return (
    <div className="ach-panel">
      <div className="ach-header">
        <span className="ach-title">🏆 成就系统</span>
        <span className="ach-level">Lv.{level.level} {level.title}</span>
      </div>

      {/* 等级进度 */}
      <div className="ach-level-bar">
        <div className="ach-lb-label">经验值 {nextLevelText}</div>
        <div className="ach-lb-track">
          <div className="ach-lb-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 已获得 */}
      <div className="ach-section">
        <div className="ach-section-title">🔓 已获得 ({unlocked.length})</div>
        <div className="ach-list">
          {unlocked.length === 0 && <div className="ach-empty">暂无成就，开始跑步吧！</div>}
          {unlocked.map((ua) => {
            const ach = ALL_ACHIEVEMENTS.find((a) => a.id === ua.achievementId);
            if (!ach) return null;
            return (
              <div key={ua.achievementId} className="ach-item unlocked">
                <span className="ach-icon">{ach.icon}</span>
                <div className="ach-info">
                  <div className="ach-name">{ach.name}</div>
                  <div className="ach-desc">{ach.description}</div>
                </div>
                <span className="ach-date">
                  {ua.unlockedAt ? ua.unlockedAt.slice(5, 10) : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 未获得 */}
      <div className="ach-section">
        <div className="ach-section-title">🔒 未获得 ({locked.length})</div>
        <div className="ach-list">
          {locked.map((ua) => {
            const ach = ALL_ACHIEVEMENTS.find((a) => a.id === ua.achievementId);
            if (!ach) return null;
            return (
              <div key={ua.achievementId} className="ach-item locked">
                <span className="ach-icon ach-icon-locked">{ach.icon}</span>
                <div className="ach-info">
                  <div className="ach-name">{ach.name}</div>
                  <div className="ach-desc">{ach.description}</div>
                </div>
                <div className="ach-progress-wrap">
                  <div className="ach-progress-bar">
                    <div className="ach-progress-fill" style={{ width: `${ua.progress * 100}%` }} />
                  </div>
                  <span className="ach-progress-text">{ua.progressText}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
