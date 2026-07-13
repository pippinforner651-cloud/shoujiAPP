import { useEffect } from 'react';
import { useProgressStore } from '../store/progressStore';
import { subscribeProgress } from '../store/progressStore';

/** 格式化公里数 */
function fmtKm(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k`;
  return km.toFixed(0);
}

export default function ProgressCard() {
  const { info, initialized, initialize, refresh } = useProgressStore();

  useEffect(() => {
    initialize();
    subscribeProgress();
    // 首次初始化后 refresh 一次
    refresh();
  }, [initialize, refresh]);

  const {
    realKm,
    virtualKm,
    completionRate,
    currentCity,
    nextCity,
    headingToCity,
    remainingToNextKm,
    remainingToNextRealKm,
    totalVirtualKm,
  } = info;

  if (!initialized) {
    return (
      <div className="progress-card loading">
        <div className="progress-loading">加载进度中...</div>
      </div>
    );
  }

  const isComplete = virtualKm >= totalVirtualKm;
  const currentCityName = currentCity?.city ?? '深圳';

  return (
    <div className="progress-card">
      {/* 当前旅行位置 */}
      <div className="progress-heading">
        <span className="progress-emoji">{isComplete ? '🏆' : '🚗'}</span>
        <span className="progress-text">
          {isComplete ? '已完成全程环游！' : `正在前往 ${headingToCity}`}
        </span>
      </div>

      {/* 进度条 */}
      <div className="progress-bar-wrap">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(completionRate, 100)}%` }}
        />
        <div className="progress-bar-label">{completionRate.toFixed(1)}%</div>
      </div>

      {/* 关键数据 */}
      <div className="progress-metrics">
        <div className="progress-metric">
          <div className="pm-label">当前城市</div>
          <div className="pm-value">{currentCityName}</div>
          {currentCity && (
            <div className="pm-sub">{currentCity.province}</div>
          )}
        </div>

        <div className="progress-metric">
          <div className="pm-label">已完成</div>
          <div className="pm-value accent">{fmtKm(virtualKm)}</div>
          <div className="pm-sub">/ {fmtKm(totalVirtualKm)} km</div>
        </div>

        {!isComplete && nextCity && (
          <div className="progress-metric">
            <div className="pm-label">距下一站</div>
            <div className="pm-value">{fmtKm(remainingToNextKm)}</div>
            <div className="pm-sub">需跑 {remainingToNextRealKm.toFixed(1)} km</div>
          </div>
        )}
      </div>

      {/* 跑步概览小字 */}
      <div className="progress-footnote">
        累计跑步 {realKm.toFixed(1)} km · 虚拟推进 {virtualKm.toFixed(1)} km
      </div>
    </div>
  );
}
