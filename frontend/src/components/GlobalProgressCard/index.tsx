import { useEffect } from 'react';
import { useGlobalStore } from '../../store/globalProgressStore';

/** 格式化数字 */
function fmt(n: number): string {
  if (n >= 100000) return (n / 10000).toFixed(0) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toFixed(0);
}

export default function GlobalProgressCard() {
  const { progress, initialized, initialize } = useGlobalStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
    return <div className="global-card loading"><div className="global-loading">加载全民数据...</div></div>;
  }

  // 数据校验
  const sumFromRecords = progress.allRunners.reduce((s, r) => s + r.totalRunKm, 0);
  const validationOk = Math.abs(sumFromRecords - progress.totalRealKm) < 0.01;

  return (
    <div className="global-card">
      {/* 标题 */}
      <div className="global-header">
        <span className="global-title">🌍 全民环游</span>
        <span className="global-count">{progress.participantCount} 人参与</span>
      </div>

      {/* 核心数据 */}
      <div className="global-stats">
        <div className="global-stat">
          <div className="gs-label">全民总跑量</div>
          <div className="gs-value">{fmt(progress.totalRealKm)}</div>
          <div className="gs-unit">公里</div>
        </div>
        <div className="global-stat">
          <div className="gs-label">全民位置</div>
          <div className="gs-value accent">{progress.currentCity}</div>
          <div className="gs-unit">#{progress.currentCityIndex + 1} 站</div>
        </div>
        <div className="global-stat">
          <div className="gs-label">完成比例</div>
          <div className="gs-value">{progress.completionRate.toFixed(2)}</div>
          <div className="gs-unit">%</div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="global-bar-wrap">
        <div
          className="global-bar-fill"
          style={{ width: `${Math.min(progress.completionRate, 100)}%` }}
        />
      </div>

      {/* 数据校验 */}
      <div className="global-verify">
        排行榜累计：{fmt(sumFromRecords)} km &nbsp;|&nbsp;
        全民统计：{fmt(progress.totalRealKm)} km &nbsp;|&nbsp;
        校验：{validationOk ? '✅ 一致' : '❌ 不一致'}
      </div>
    </div>
  );
}
