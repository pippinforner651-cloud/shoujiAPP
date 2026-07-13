import { useEffect, useState } from 'react';
import { useRunStore } from '../store/runStore';
import { adaptActivities } from '../services/activity/activityAdapter';
import { generateMockAppleWatchData } from '../mock/appleWatchMock';
import type { RunRecord } from '../types/run';

/** 格式化分钟数为 "X小时Y分钟" */
function formatDuration(min: number): string {
  if (min < 1) return `${Math.round(min * 60)}秒`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
}

/** 格式化配速为 "X'YY"/km */
function formatPace(minPerKm: number): string {
  if (minPerKm <= 0) return '--';
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}'${s.toString().padStart(2, '0' )}"`;
}

export default function RunTest() {
  const { records, stats, initialized, initialize, addRecord, removeRecord, clearAll } = useRunStore();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [mockStatus, setMockStatus] = useState<string | null>(null);

  // 初始化
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 添加记录
  const handleAdd = () => {
    const d = parseFloat(distance);
    const dur = parseFloat(duration);
    if (!d || d <= 0 || !dur || dur <= 0) return;
    addRecord(date, d, dur);
    setDistance('');
    setDuration('');
  };

  // 模拟同步
  const handleMockSync = () => {
    setMockStatus(null);
    const mockData = generateMockAppleWatchData();
    const results = adaptActivities(mockData);

    const successCount = results.filter((r) => r.success).length;
    const totalVirtual = results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + (r.virtualKm ?? 0), 0);

    const message = `✅ 模拟同步完成：${successCount}/${results.length} 条记录
总虚拟推进 ${Math.round(totalVirtual)} km`;
    setMockStatus(message);

    // 3 秒后自动清除状态
    setTimeout(() => setMockStatus(null), 5000);
  };

  // 今日里程
  const todayKm = records
    .filter((r) => r.date === new Date().toISOString().slice(0, 10))
    .reduce((sum, r) => sum + r.distanceKm, 0);

  return (
    <div className="run-test">
      <h2>🏃 跑步数据测试</h2>

      {/* 统计概览 */}
      {initialized && (
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-label">累计跑量</div>
            <div className="stat-value">{stats.totalDistanceKm.toFixed(1)}</div>
            <div className="stat-unit">公里</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">累计时间</div>
            <div className="stat-value">{formatDuration(stats.totalDurationMin)}</div>
            <div className="stat-unit">总时长</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">平均配速</div>
            <div className="stat-value">{formatPace(stats.averagePace)}</div>
            <div className="stat-unit">/公里</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">跑步次数</div>
            <div className="stat-value">{stats.totalRuns}</div>
            <div className="stat-unit">次</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">今日里程</div>
            <div className="stat-value">{todayKm.toFixed(1)}</div>
            <div className="stat-unit">公里</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">最远单次</div>
            <div className="stat-value">{stats.longestRunKm.toFixed(1)}</div>
            <div className="stat-unit">公里</div>
          </div>
        </div>
      )}

      {/* 添加记录表单 */}
      <div className="input-form">
        <h3>添加跑步记录</h3>
        <div className="input-row">
          <label>
            日期
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            距离 (km)
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="5.0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </label>
          <label>
            时长 (min)
            <input
              type="number"
              step="1"
              min="0"
              placeholder="30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
          <button className="btn-add" onClick={handleAdd} disabled={!distance || !duration}>
            + 添加
          </button>
        </div>
      </div>

      {/* 模拟同步按钮 */}
      <div className="mock-section">
        <button className="btn-mock-sync" onClick={handleMockSync}>
          🧪 模拟运动同步（Apple Watch）
        </button>
        <div className="mock-hint">
          57km → 虚拟 570km · 深圳→厦门
        </div>
        {mockStatus && (
          <div className="mock-status">{mockStatus}</div>
        )}
      </div>

      {/* 历史记录列表 */}
      <div className="history">
        <div className="history-header">
          <h3>历史记录</h3>
          {records.length > 0 && (
            <button className="btn-clear" onClick={() => { if (confirm('确定清空所有数据？')) clearAll(); }}>
              清空
            </button>
          )}
        </div>
        {records.length === 0 ? (
          <div className="empty-state">暂无跑步记录，添加一条试试</div>
        ) : (
          <div className="record-list">
            {[...records].reverse().map((r: RunRecord) => (
              <div key={r.id} className="record-item">
                <div className="record-main">
                  <span className="record-date">{r.date}</span>
                  <span className="record-dist">{r.distanceKm.toFixed(2)} km</span>
                  <span className="record-dur">{formatDuration(r.durationMin)}</span>
                  <span className="record-pace">{formatPace(r.pace)}/km</span>
                </div>
                <button
                  className="btn-del"
                  onClick={() => removeRecord(r.id)}
                  title="删除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
