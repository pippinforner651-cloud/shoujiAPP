import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRunStore } from '../../store/runStore';
import { adaptToRunStore } from '../../services/activityAdapter';
import { generateAppleWatchActivity, generateHuaweiWatchActivity } from '../../mock/deviceActivities';
import { generateShenzhenGpsTrack } from '../../mock/gpsTracks';
import RunTrackMap from '../RunTrackMap';
import { SOURCE_EMOJIS } from '../../services/activityAdapter/types';
import { analyzeSegments } from '../../services/activityAnalysis/segmentAnalysis';
import { formatPace } from '../../services/activityAnalysis/paceAnalysis';
import type { ActivitySource } from '../../types/activity';
import type { KmSplit } from '../../types/analysis';

/** 格式化分钟为 "X时X分" */
function fmtMin(min: number): string {
  if (min < 1) return `${Math.round(min * 60)}秒`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}时${m}分` : `${m}分`;
}

export default function TodayActivityCard() {
  const { initialize, addRecord, getTodayActivities } = useRunStore();
  const [activities, setActivities] = useState(getTodayActivities());
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const refresh = useCallback(() => {
    setActivities(getTodayActivities());
  }, [getTodayActivities]);

  const showMsg = (msg: string) => {
    setSyncMsg(msg);
    setTimeout(() => setSyncMsg(null), 3000);
  };

  // 模拟 Apple Watch 同步
  const handleSyncApple = () => {
    const input = generateAppleWatchActivity();
    const result = adaptToRunStore(input);
    if (result.success) {
      showMsg(`✅ Apple Watch 同步成功：8.2 km`);
      refresh();
    }
  };

  // 模拟华为手表同步
  const handleSyncHuawei = () => {
    const input = generateHuaweiWatchActivity();
    const result = adaptToRunStore(input);
    if (result.success) {
      showMsg(`✅ 华为手表同步成功：6.5 km`);
      refresh();
    }
  };

  // 模拟 GPS 跑步（含轨迹）
  const handleGpsRun = () => {
    const gpsTrack = generateShenzhenGpsTrack();
    const totalDist = 5.0;
    const durationMin = 25;
    const record = addRecord(
      new Date().toISOString().slice(0, 10),
      totalDist,
      durationMin,
      '📍 GPS 轨迹跑步 · 深圳湾公园',
      gpsTrack
    );
    if (record) {
      showMsg(`✅ GPS 轨迹记录成功：${totalDist} km · ${gpsTrack.length} 个轨迹点`);
      refresh();
    }
  };

  const hasActivity = activities.count > 0;
  const hasGps = activities.gpsCount > 0 && activities.latestGpsTrack && activities.latestGpsTrack.length > 1;

  // 公里分段分析
  const segments: KmSplit[] = useMemo(() => {
    if (!activities.latestGpsTrack || activities.latestGpsTrack.length < 2) return [];
    return analyzeSegments(activities.latestGpsTrack);
  }, [activities.latestGpsTrack]);

  const fastestKm = segments.length > 0
    ? segments.reduce((best, s) => s.paceSec < best.paceSec ? s : best, segments[0])
    : null;

  return (
    <div className="today-card">
      <div className="today-header">
        <span className="today-title">📊 今日运动</span>
        {hasActivity && (
          <span className="today-count">
            {activities.count} 条 · {activities.sources.map((s) => SOURCE_EMOJIS[s as ActivitySource] || '📡').join(' ')}
          </span>
        )}
      </div>

      {hasActivity ? (
        <div className="today-stats">
          <div className="today-stat">
            <div className="today-stat-val">{activities.totalKm.toFixed(1)}</div>
            <div className="today-stat-label">公里</div>
          </div>
          <div className="today-stat">
            <div className="today-stat-val">{fmtMin(activities.totalMin)}</div>
            <div className="today-stat-label">时长</div>
          </div>
          <div className="today-stat">
            <div className="today-stat-val">{activities.avgPace}</div>
            <div className="today-stat-label">配速</div>
          </div>
          <div className="today-stat">
            <div className="today-stat-val">{activities.totalCal || '--'}</div>
            <div className="today-stat-label">千卡</div>
          </div>
        </div>
      ) : (
        <div className="today-empty">
          今日暂无运动记录
        </div>
      )}

      {/* GPS 轨迹地图 */}
      {hasGps && (
        <div className="today-track">
          <div className="today-track-header">
            <span>📍 GPS 轨迹</span>
            <span className="today-track-info">{activities.gpsCount} 条 · {activities.gpsPoints} 个点</span>
          </div>
          <RunTrackMap gpsTrack={activities.latestGpsTrack!} height="160px" />

          {/* 公里分段 */}
          {segments.length > 0 && (
            <div className="today-splits">
              <div className="today-split-header">
                <span>📊 公里分段</span>
                {fastestKm && <span className="today-split-best">🏆 最快 {fastestKm.km}km: {formatPace(fastestKm.paceSec)}</span>}
              </div>
              <div className="today-split-list">
                {segments.map((seg) => (
                  <div key={seg.km} className={`today-split-item ${seg.paceSec === fastestKm?.paceSec ? 'best' : ''}`}>
                    <span className="ts-km">{seg.km}km</span>
                    <span className="ts-pace">{formatPace(seg.paceSec)}</span>
                    <span className="ts-duration">{Math.floor(seg.durationSec / 60)}:{String(seg.durationSec % 60).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="today-actions">
        <button className="today-btn gps-run" onClick={handleGpsRun}>
          📍 GPS 模拟跑步（5 km）
        </button>
      </div>
      <div className="today-actions" style={{ marginTop: '0.3rem' }}>
        <button className="today-btn apple" onClick={handleSyncApple}>
          🍎 Apple Watch（8.2 km）
        </button>
        <button className="today-btn huawei" onClick={handleSyncHuawei}>
          📱 华为手表（6.5 km）
        </button>
      </div>

      {syncMsg && <div className="today-msg">{syncMsg}</div>}
    </div>
  );
}
