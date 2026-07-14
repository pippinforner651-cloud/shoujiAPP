import E23Icon from '../E23Icon';
import RunTrackMap from '../RunTrackMap';
import type { RunRecord } from '../../types/run';
import type { CompletedRunSummary, RouteSnapshot } from '../../utils/runFlow';
import type { CoreMilestone } from '../../utils/milestoneFeedback';

interface Props {
  record: RunRecord;
  summary: CompletedRunSummary;
  routeAfter: RouteSnapshot;
  milestones: CoreMilestone[];
  onReset: () => void;
  onBackHome: () => void;
  onViewMap: () => void;
}

function durationLabel(minutes: number) {
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}小时${mins}分` : `${mins}分${String(seconds).padStart(2, '0')}秒`;
}

export default function RunSummary({ record, summary, routeAfter, milestones, onReset, onBackHome, onViewMap }: Props) {
  const isManual = record.source === 'manual';
  return (
    <section className="run-summary-v1">
      <header className="summary-hero">
        <div className="summary-check"><E23Icon name="run" size={28} /></div>
        <p className="section-kicker">本次跑步已保存在当前设备</p>
        <h1>这一程，已经算数</h1>
        <p>{summary.arrivedCity ? `到站！你已经跑进${summary.arrivedCity}` : `距离下一站又近了 ${summary.remainingReducedKm.toFixed(0)} 虚拟公里`}</p>
      </header>

      <div className="summary-main-stats">
        <article className="primary"><strong>{record.distanceKm.toFixed(2)}</strong><span>实际公里</span></article>
        <article><strong>{summary.virtualDistanceKm.toFixed(0)}</strong><span>虚拟公里</span></article>
        <article><strong>{durationLabel(record.durationMin)}</strong><span>本次用时</span></article>
        <article><strong>{summary.paceLabel}</strong><span>平均配速</span></article>
      </div>

      <div className={`record-trust-note ${isManual ? 'manual' : 'device'}`}>
        <E23Icon name="info" size={17} />
        <span>{isManual ? '本人手动录入 · 未经过设备验证' : '本机GPS记录 · 轨迹数据保存在当前设备'}</span>
      </div>

      {record.gpsTrack && record.gpsTrack.length >= 2 && <div className="summary-track"><div className="summary-section-title">本次运动轨迹</div><RunTrackMap gpsTrack={record.gpsTrack} height="160px" /></div>}

      <div className="summary-journey-card">
        <div className="summary-section-title">中国环游推进</div>
        <div className="summary-progress-row"><span>总进度变化</span><strong>+{summary.progressGainedPercent.toFixed(2)}%</strong></div>
        <div className="summary-progress-track"><i style={{ width: `${Math.min(100, routeAfter.completionRate)}%` }} /></div>
        <div className="summary-route-grid">
          <div><span>当前位置</span><strong>{routeAfter.currentCity}</strong></div>
          <div><span>下一站</span><strong>{routeAfter.nextCity ?? '全程完成'}</strong></div>
          <div><span>距下一站</span><strong>{routeAfter.remainingToNextKm.toFixed(0)} 虚拟km</strong></div>
          <div><span>本次缩短</span><strong>{summary.remainingReducedKm.toFixed(0)} 虚拟km</strong></div>
        </div>
      </div>

      {milestones.length > 0 && <div className="summary-milestones">
        <div className="summary-section-title">本次新里程碑</div>
        {milestones.map((milestone) => <article key={milestone.id}><div><E23Icon name="route" size={18} /></div><span><strong>{milestone.name}</strong><small>{milestone.description}</small></span></article>)}
      </div>}

      <div className="summary-actions">
        <button className="primary-action" onClick={onBackHome}>返回旅程首页</button>
        <button className="secondary-action" onClick={onViewMap}>查看路线地图</button>
        <button className="text-action" onClick={onReset}>再录一条</button>
        <button className="share-coming" disabled>分享卡片 · 即将开放</button>
      </div>
    </section>
  );
}
