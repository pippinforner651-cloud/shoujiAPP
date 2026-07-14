import { useState, useEffect, useMemo } from 'react';
import ChinaMap from './components/ChinaMap';
import CityBottomSheet from './components/CityBottomSheet';
import GlobalProgressCard from './components/GlobalProgressCard';
import GlobalRanking from './components/GlobalRanking';
import FriendsList from './components/FriendsList';
import RunSession from './components/RunSession';
import MyProfile from './components/MyProfile';
import E23Icon from './components/E23Icon';
import { useRunStore } from './store/runStore';
import { useCityStore } from './store/cityStore';

import { subscribeProgress, useProgressStore } from './store/progressStore';
import { BRAND, getGreeting } from './config/brand';
import './App.css';

type AppTab = 'home' | 'run' | 'rank' | 'profile';

const tabs: { key: AppTab; label: string; icon: 'home' | 'run' | 'rank' | 'profile' }[] = [
  { key: 'home', label: '首页', icon: 'home' },
  { key: 'run', label: '跑步', icon: 'run' },
  { key: 'rank', label: '排行', icon: 'rank' },
  { key: 'profile', label: '我的', icon: 'profile' },
];

interface Props {
  onLogout: () => void;
  initialTab?: 'home' | 'run';
}

export default function MainApp({ onLogout, initialTab = 'home' }: Props) {
  const [activeTab, setActiveTab] = useState<AppTab>(initialTab);

  const stats = useRunStore((s) => s.stats);
  const records = useRunStore((s) => s.records);
  const { initialize: initRun } = useRunStore();
  const { initialize: initCity, checkAndUnlock } = useCityStore();
  const progress = useProgressStore((s) => s.info);
  const initProgress = useProgressStore((s) => s.initialize);

  useEffect(() => {
    initRun();
    initCity();
    initProgress();
    subscribeProgress();
  }, [initRun, initCity, initProgress]);

  useEffect(() => {
    if (stats.totalDistanceKm > 0) checkAndUnlock(stats.totalDistanceKm);
  }, [stats.totalDistanceKm, checkAndUnlock]);

  // 首页核心数据全部读取同一个路线进度来源。
  const virtualKm = progress.virtualKm;
  const todayKm = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return records.filter((r) => r.date === today).reduce((s, r) => s + r.distanceKm, 0);
  }, [records]);

  const currentCity = progress.currentCity?.city ?? '深圳';
  const nextCity = progress.headingToCity;
  const remainingKm = progress.remainingToNextKm;

  const lastRun = useMemo(() => {
    if (!records.length) return null;
    return records[records.length - 1];
  }, [records]);

  const streakDays = useMemo(() => {
    if (!records.length) return 0;
    let streak = 0;
    const d = new Date();
    while (true) {
      const ds = d.toISOString().slice(0, 10);
      if (records.some((r) => r.date === ds)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }, [records]);

  return (
    <div className="app app-mobile">
      <main className="app-main-mobile">
        {activeTab === 'home' && (
          <div className="tab-page tab-scroll">
            {/* 问候区 */}
            <div className="home-greeting">
              <span>{getGreeting()}</span>
              <span className="home-greeting-city">📍 {currentCity}</span>
            </div>

            {/* 核心数据区 */}
            <div className="home-dashboard">
              <div className="home-dash-card accent">
                <span className="home-dash-val">{todayKm.toFixed(1)}</span>
                <span className="home-dash-label">今日跑量 (km)</span>
              </div>
              <div className="home-dash-card">
                <span className="home-dash-val">{stats.totalDistanceKm.toFixed(0)}</span>
                <span className="home-dash-label">累计 (km)</span>
              </div>
              <div className="home-dash-card">
                <span className="home-dash-val">{virtualKm.toLocaleString()}</span>
                <span className="home-dash-label">虚拟里程 (km)</span>
              </div>
              <div className="home-dash-card">
                <span className="home-dash-val">{streakDays}</span>
                <span className="home-dash-label">连续天数</span>
              </div>
            </div>

            {/* 进度卡 */}
            <div className="home-progress-card">
              <div className="home-progress-header">
                <span className="home-progress-title">E23当前到达</span>
                <span className="home-progress-map-btn" onClick={() => setActiveTab('home')}>查看地图 ›</span>
              </div>
              <div className="home-progress-cities">
                <span className="home-progress-city current">{currentCity}</span>
                <span className="home-progress-arrow">→</span>
                <span className="home-progress-city next">{nextCity}</span>
              </div>
              <div className="home-progress-bar">
                <div className="home-progress-fill" style={{ width: `${progress.completionRate}%` }} />
              </div>
              <span className="home-progress-remaining">距下一站还有 {remainingKm.toLocaleString()} 虚拟公里</span>
            </div>

            {/* 地图缩略 */}
            <div className="home-map-mini">
              <ChinaMap mode="personal" height="200px" />
            </div>

            {/* 最近跑步 */}
            {lastRun ? (
              <div className="home-last-run">
                <span className="home-last-run-title">最近运动</span>
                <div className="home-last-run-card">
                  <span className="home-last-run-date">{lastRun.date}</span>
                  <span className="home-last-run-dist">{lastRun.distanceKm.toFixed(2)} km</span>
                  <span className="home-last-run-dur">{Math.round(lastRun.durationMin)} 分钟</span>
                </div>
              </div>
            ) : (
              <div className="home-empty-state">
                <E23Icon name="runner" size={48} color="#667" />
                <p className="home-empty-text">还没有跑步记录</p>
                <p className="home-empty-hint">完成一次跑步，成为首位出发的E23跑者</p>
              </div>
            )}

            {/* CTA */}
            <button className="home-start-btn" onClick={() => setActiveTab('run')}>
              <E23Icon name="run" size={20} color="#fff" />
              <span>{BRAND.HOME.startRun}</span>
            </button>
          </div>
        )}

        {activeTab === 'run' && (
          <div className="tab-page"><RunSession /></div>
        )}

        {activeTab === 'rank' && (
          <div className="tab-page tab-scroll">
            <div className="rank-header">
              <h2 className="rank-header-title">{BRAND.RANKING.title}</h2>
              <p className="rank-header-desc">{BRAND.RANKING.description}</p>
            </div>
            <GlobalProgressCard />
            <GlobalRanking />
            <FriendsList />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="tab-page tab-scroll">
            <MyProfile onLogout={onLogout} />
          </div>
        )}
      </main>

      <nav className="bottom-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <E23Icon name={tab.icon} size={22} color={activeTab === tab.key ? '#F28C22' : '#667'} />
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <CityBottomSheet />
    </div>
  );
}
