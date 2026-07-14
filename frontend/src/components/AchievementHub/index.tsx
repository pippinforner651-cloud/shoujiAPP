import { useEffect } from 'react';
import { useAchievementStore } from '../../store/achievementStore';
import { useCityStore } from '../../store/cityStore';
import { useRunStore } from '../../store/runStore';
import { ALL_ACHIEVEMENTS } from '../../types/achievement';
import E23Icon, { type E23IconName } from '../E23Icon';

export default function AchievementHub() {
  const records = useRunStore((state) => state.records);
  const cities = useCityStore((state) => state.unlockedCities);
  const { userAchievements, level, totalXp, refresh } = useAchievementStore();

  useEffect(() => { refresh(); }, [records, cities, refresh]);

  const unlocked = userAchievements.filter((item) => item.unlocked).length;

  return (
    <div className="achievement-hub">
      <header className="achievement-hero">
        <span className="achievement-hero-icon"><E23Icon name="award" size={30} /></span>
        <div><p className="section-kicker">本地成就</p><h1>每一次坚持都有记录</h1></div>
        <strong>{unlocked}/{ALL_ACHIEVEMENTS.length}</strong>
      </header>

      <section className="achievement-level-card">
        <div><span>当前等级</span><strong>Lv.{level.level} · {level.title}</strong></div>
        <span>{totalXp} XP</span>
      </section>

      <div className="truth-notice"><E23Icon name="info" size={18} /><p>当前版本只展示本机真实跑步数据，不提供虚构好友、全球排名或在线人数。</p></div>

      <section className="achievement-list" aria-label="成就列表">
        {userAchievements.map((state) => {
          const definition = ALL_ACHIEVEMENTS.find((item) => item.id === state.achievementId);
          if (!definition) return null;
          return (
            <article key={definition.id} className={`achievement-item ${state.unlocked ? 'unlocked' : ''}`}>
              <span className="achievement-icon"><E23Icon name={definition.icon as E23IconName} size={22} /></span>
              <div className="achievement-copy"><div><h2>{definition.name}</h2><span>{state.unlocked ? '已达成' : state.progressText}</span></div><p>{definition.description}</p><i><b style={{ width: `${state.progress * 100}%` }} /></i></div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
