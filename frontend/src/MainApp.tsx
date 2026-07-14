import { useEffect, useMemo, useState } from 'react';
import ChinaMap from './components/ChinaMap';
import CityBottomSheet from './components/CityBottomSheet';
import E23Icon from './components/E23Icon';
import FriendsList from './components/FriendsList';
import GlobalProgressCard from './components/GlobalProgressCard';
import GlobalRanking from './components/GlobalRanking';
import MyProfile from './components/MyProfile';
import RunSession from './components/RunSession';
import { BRAND } from './config/brand';
import { useCityStore } from './store/cityStore';
import { subscribeProgress, useProgressStore } from './store/progressStore';
import { useRunStore } from './store/runStore';
import { useUserStore } from './store/userStore';
import { buildHomeJourney } from './utils/homeJourney';
import './App.css';

type AppTab = 'home' | 'run' | 'rank' | 'profile';
const tabs: { key: AppTab; label: string; icon: 'home' | 'run' | 'rank' | 'profile' }[] = [
  { key: 'home', label: '旅程', icon: 'home' },
  { key: 'run', label: '跑步', icon: 'run' },
  { key: 'rank', label: '同行', icon: 'rank' },
  { key: 'profile', label: '我的', icon: 'profile' },
];

interface Props { onLogout: () => void; initialTab?: 'home' | 'run'; }

export default function MainApp({ onLogout, initialTab = 'home' }: Props) {
  const [activeTab, setActiveTab] = useState<AppTab>(initialTab);
  const stats = useRunStore((state) => state.stats);
  const records = useRunStore((state) => state.records);
  const initializeRuns = useRunStore((state) => state.initialize);
  const initializeCities = useCityStore((state) => state.initialize);
  const checkAndUnlock = useCityStore((state) => state.checkAndUnlock);
  const unlockedCities = useCityStore((state) => state.unlockedCities);
  const progress = useProgressStore((state) => state.info);
  const initializeProgress = useProgressStore((state) => state.initialize);
  const account = useUserStore((state) => state.account);
  const home = useMemo(() => buildHomeJourney(records), [records]);

  useEffect(() => {
    initializeRuns();
    initializeCities();
    initializeProgress();
    subscribeProgress();
  }, [initializeRuns, initializeCities, initializeProgress]);

  useEffect(() => {
    checkAndUnlock(stats.totalDistanceKm);
  }, [stats.totalDistanceKm, checkAndUnlock]);

  const lastRun = records[records.length - 1] ?? null;
  const currentCity = progress.currentCity?.city ?? '深圳';
  const nextCity = progress.nextCity?.city ?? '全程完成';
  const todayRemaining = Math.max(0, home.goalKm - home.todayKm);

  return (
    <div className="app app-mobile">
      <main className="app-main-mobile">
        {activeTab === 'home' && (
          <div className="tab-page tab-scroll journey-home">
            <header className="journey-header">
              <div><p>{home.hasRecords ? '欢迎回来' : '欢迎出发'}</p><h1>{account.nickname || 'E23跑者'}</h1></div>
              <div className="journey-location"><E23Icon name="route" size={16} />{currentCity}</div>
            </header>

            {!home.hasRecords ? (
              <section className="first-run-hero">
                <div className="first-run-route"><span>深圳</span><div><i /></div><span>厦门</span></div>
                <p className="section-kicker">你的中国旅程等待第一步</p>
                <h2>跑1公里，路线前进10公里</h2>
                <p>从深圳出发，沿48座城市完成21,423公里的闭环旅程。记录保存在当前设备。</p>
                <button className="primary-action" onClick={() => setActiveTab('run')}>
                  <E23Icon name="run" size={20} /> 录入第一条跑步
                </button>
              </section>
            ) : (
              <section className={`today-action-card ${home.goalCompleted ? 'completed' : ''}`}>
                <div className="today-action-top">
                  <div><p className="section-kicker">今日行动</p><h2>{home.primaryPrompt}</h2></div>
                  <span>{home.goalCompleted ? '已完成' : `还差 ${todayRemaining.toFixed(1)} km`}</span>
                </div>
                <div className="today-distance"><strong>{home.todayKm.toFixed(1)}</strong><span>/ {home.goalKm} km</span></div>
                <div className="today-goal-track"><i style={{ width: `${home.goalPercent}%` }} /></div>
                <button className="primary-action" onClick={() => setActiveTab('run')}>
                  <E23Icon name="run" size={20} /> {home.goalCompleted ? '再跑一段' : '开始今天的跑步'}
                </button>
              </section>
            )}

            <section className="journey-card-v1">
              <div className="section-heading"><div><p className="section-kicker">当前旅程</p><h2>{currentCity} <span>前往</span> {nextCity}</h2></div><strong>{progress.completionRate.toFixed(1)}%</strong></div>
              <div className="journey-progress-track"><i style={{ width: `${progress.completionRate}%` }} /></div>
              <div className="journey-metrics">
                <div><span>距下一站</span><strong>{progress.remainingToNextKm.toLocaleString()}<small> 虚拟km</small></strong></div>
                <div><span>还需真实跑步</span><strong>{progress.remainingToNextRealKm.toFixed(1)}<small> km</small></strong></div>
              </div>
              <p className="journey-route-note">累计实际 {stats.totalDistanceKm.toFixed(1)} km · 虚拟推进 {progress.virtualKm.toLocaleString()} km</p>
            </section>

            <section className="home-map-journey" aria-label="中国环游路线地图">
              <div className="section-heading"><div><p className="section-kicker">路线位置</p><h2>每一步都在地图上发生</h2></div></div>
              <ChinaMap mode="personal" height="228px" />
            </section>

            {home.hasRecords && (
              <section className="recent-results">
                <div className="section-heading"><div><p className="section-kicker">近期成果</p><h2>你的坚持正在累积</h2></div></div>
                <div className="result-grid">
                  <article><span>近7天</span><strong>{home.weekKm.toFixed(1)} km</strong></article>
                  <article><span>连续跑步</span><strong>{home.streakDays} 天</strong></article>
                  <article><span>已解锁城市</span><strong>{unlockedCities.length} / 48</strong></article>
                </div>
                {lastRun && <div className="last-run-row"><div><span>最近一次 · {lastRun.date}</span><strong>{lastRun.distanceKm.toFixed(2)} km</strong></div><span>{lastRun.durationMin.toFixed(0)} 分钟</span></div>}
              </section>
            )}

            <section className="next-motivation-card">
              <div><p className="section-kicker">下一个里程碑</p><h2>{home.nextMilestone.label}</h2>
                <p>{home.hasRecords ? `再跑 ${home.nextMilestone.remainingKm.toFixed(1)} km 即可达成` : '完成一次真实记录，旅程就会开始推进'}</p></div>
              <button onClick={() => setActiveTab(home.hasRecords ? 'profile' : 'run')}>{home.hasRecords ? '查看我的旅程' : '现在出发'}</button>
            </section>
          </div>
        )}

        {activeTab === 'run' && <div className="tab-page"><RunSession /></div>}
        {activeTab === 'rank' && <div className="tab-page tab-scroll"><div className="rank-header"><h2 className="rank-header-title">{BRAND.RANKING.title}</h2><p className="rank-header-desc">{BRAND.RANKING.description}</p></div><GlobalProgressCard /><GlobalRanking /><FriendsList /></div>}
        {activeTab === 'profile' && <div className="tab-page tab-scroll"><MyProfile onLogout={onLogout} /></div>}
      </main>

      <nav className="bottom-tabs" aria-label="主要导航">
        {tabs.map((tab) => <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
          <E23Icon name={tab.icon} size={22} color={activeTab === tab.key ? '#F28C22' : '#667085'} /><span className="tab-label">{tab.label}</span>
        </button>)}
      </nav>
      <CityBottomSheet />
    </div>
  );
}
