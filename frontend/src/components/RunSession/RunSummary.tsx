import { useEffect, useRef } from 'react';
import RunTrackMap from '../RunTrackMap';
import type { RunSessionData } from './runState';
import { formatTime, formatPace } from './runState';
import { getRouteData } from '../../data/routeLoader';
import { useRunStore } from '../../store/runStore';
import { useGlobalStore } from '../../store/globalProgressStore';

interface Props {
  session: RunSessionData;
  onReset: () => void;
}

export default function RunSummary({ session, onReset }: Props) {
  const { addRecord } = useRunStore();
  const { refresh } = useGlobalStore();
  const hasUploaded = useRef(false);

  useEffect(() => {
    if (hasUploaded.current || session.distanceKm <= 0) return;
    hasUploaded.current = true;

    // 自动上传到 runStore
    const record = addRecord(
      new Date().toISOString().slice(0, 10),
      session.distanceKm,
      session.durationSec / 60,
      `🏃 真实跑步 · ${session.points.length} 个GPS点`,
      session.points,
      {
        durationSec: session.durationSec,
        calories: session.calories,
        source: 'app_gps',
        verificationStatus: 'verified_device',
        deviceName: navigator.platform || '本机',
      }
    );

    if (record) {
      // 刷新全民数据
      refresh();
      console.log(`[RunSession] 自动上传: ${session.distanceKm.toFixed(2)} km`);
    }
  }, [session.distanceKm, session.durationSec, session.points, addRecord, refresh]);

  // 环游推进计算
  const { nodes } = getRouteData();
  const virtualKm = session.distanceKm * 10;
  const totalRunKm = useRunStore((s) => s.stats.totalDistanceKm);
  const totalVirtual = totalRunKm * 10;

  let reachedCity = '深圳';
  let nextCity = '厦门';
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (totalVirtual >= nodes[i].totalDistanceKm) {
      reachedCity = nodes[i].city;
      nextCity = nodes[Math.min(i + 1, nodes.length - 1)]?.city || '🏁 完成';
      break;
    }
  }

  // 配速分析
  const avgPace = session.distanceKm > 0.01
    ? formatPace(session.durationSec / session.distanceKm)
    : '--';

  return (
    <div className="run-summary">
      <div className="rs-header">
        <div className="rs-header-icon">🎉</div>
        <div className="rs-header-title">跑步完成</div>
        <div className="rs-header-sub">{session.distanceKm.toFixed(2)} km · {formatTime(session.durationSec)}</div>
      </div>

      {/* 本次跑步数据 */}
      <div className="rs-summary-stats">
        <div className="rs-summary-stat main">
          <div className="rss-val">{session.distanceKm.toFixed(2)}</div>
          <div className="rss-label">距离 (km)</div>
        </div>
        <div className="rs-summary-stat">
          <div className="rss-val">{avgPace}</div>
          <div className="rss-label">平均配速</div>
        </div>
        <div className="rs-summary-stat">
          <div className="rss-val">{session.calories}</div>
          <div className="rss-label">千卡</div>
        </div>
        <div className="rs-summary-stat">
          <div className="rss-val">{session.points.length}</div>
          <div className="rss-label">GPS 点</div>
        </div>
      </div>

      {/* 数据可信度标签 */}
      <div className="rs-verification-badge">
        ✅ 设备直录 · 可信数据（计入排行榜）
      </div>

      {/* GPS 轨迹 */}
      {session.points.length >= 2 && (
        <div className="rs-summary-track">
          <div className="rss-section-title">📍 GPS 轨迹</div>
          <RunTrackMap gpsTrack={session.points} height="150px" />
        </div>
      )}

      {/* 环游推进 */}
      <div className="rs-summary-tour">
        <div className="rss-section-title">🗺️ 中国环游推进</div>
        <div className="rss-tour-row">
          <span className="rss-tour-label">本次推进</span>
          <span className="rss-tour-val">{virtualKm.toFixed(0)} 虚拟km</span>
        </div>
        <div className="rss-tour-row">
          <span className="rss-tour-label">累计虚拟</span>
          <span className="rss-tour-val">{totalVirtual.toLocaleString()} km</span>
        </div>
        <div className="rss-tour-row">
          <span className="rss-tour-label">当前位置</span>
          <span className="rss-tour-val accent">{reachedCity}</span>
        </div>
        <div className="rss-tour-row">
          <span className="rss-tour-label">下一城市</span>
          <span className="rss-tour-val">{nextCity}</span>
        </div>
      </div>

      {/* 操作 */}
      <div className="rs-summary-actions">
        <button className="rs-btn start" onClick={onReset}>
          🔄 继续跑步
        </button>
      </div>
    </div>
  );
}
