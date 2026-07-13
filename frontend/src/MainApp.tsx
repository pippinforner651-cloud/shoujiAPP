import { useState, useEffect } from 'react';
import ChinaMap from './components/ChinaMap';
import CityBottomSheet from './components/CityBottomSheet';
import GlobalProgressCard from './components/GlobalProgressCard';
import GlobalRanking from './components/GlobalRanking';
import PersonalShareCard from './components/ShareCard/PersonalShareCard';
import FriendsList from './components/FriendsList';
import RunSession from './components/RunSession';
import MyProfile from './components/MyProfile';
import { useRunStore } from './store/runStore';
import { useCityStore } from './store/cityStore';
import { useGlobalStore } from './store/globalProgressStore';
import { subscribeProgress } from './store/progressStore';
import type { MapMode } from './components/ChinaMap/types';
import './App.css';

type AppTab = 'home' | 'run' | 'rank' | 'profile';

interface Props {
  onLogout: () => void;
}

export default function MainApp({ onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [mapMode, setMapMode] = useState<MapMode>('personal');

  const totalDistanceKm = useRunStore((s) => s.stats.totalDistanceKm);
  const globalProgress = useGlobalStore((s) => s.progress);
  const { initialize: initRun } = useRunStore();
  const { initialize: initCity, checkAndUnlock } = useCityStore();
  const { initialize: initGlobal } = useGlobalStore();

  useEffect(() => {
    initRun();
    initCity();
    initGlobal();
    subscribeProgress();
  }, [initRun, initCity, initGlobal]);

  // 跑步后自动检测城市解锁
  useEffect(() => {
    if (totalDistanceKm > 0) checkAndUnlock(totalDistanceKm);
  }, [totalDistanceKm, checkAndUnlock]);

  const tabs: { key: AppTab; label: string; icon: string }[] = [
    { key: 'home', label: '首页', icon: '🏠' },
    { key: 'run', label: '跑步', icon: '🏃' },
    { key: 'rank', label: '排行榜', icon: '🏆' },
    { key: 'profile', label: '我的', icon: '👤' },
  ];

  return (
    <div className="app app-mobile">
      <main className="app-main-mobile">
        {activeTab === 'home' && (
          <div className="tab-page">
            <div className="mode-toggle">
              <button className={`mode-btn ${mapMode === 'personal' ? 'active' : ''}`}
                onClick={() => setMapMode('personal')}>🏃 我的旅程</button>
              <button className={`mode-btn ${mapMode === 'global' ? 'active' : ''}`}
                onClick={() => setMapMode('global')}>🌍 全民旅程</button>
            </div>
            <div className="home-stats">
              <div className="home-stat">
                <span className="home-stat-val">{totalDistanceKm.toFixed(0)}</span>
                <span className="home-stat-label">我的跑量 (km)</span>
              </div>
              <div className="home-stat">
                <span className="home-stat-val accent">{globalProgress.participantCount}</span>
                <span className="home-stat-label">参与人数</span>
              </div>
              <div className="home-stat">
                <span className="home-stat-val">{globalProgress.totalRealKm > 0 ? (globalProgress.totalRealKm / 1000).toFixed(1) + 'k' : '--'}</span>
                <span className="home-stat-label">全民跑量 (km)</span>
              </div>
            </div>
            <div className="map-container-mobile">
              {mapMode === 'personal' ? (
                <ChinaMap mode="personal" height="320px" />
              ) : (
                <ChinaMap mode="global" height="320px" />
              )}
            </div>
            <div className="home-actions"><PersonalShareCard /></div>
          </div>
        )}

        {activeTab === 'run' && (
          <div className="tab-page"><RunSession /></div>
        )}

        {activeTab === 'rank' && (
          <div className="tab-page tab-scroll">
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
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <CityBottomSheet />
    </div>
  );
}
