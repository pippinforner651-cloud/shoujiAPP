import { useEffect } from 'react';
import { useGlobalStore } from '../../store/globalProgressStore';

export default function GlobalRanking() {
  const { progress, initialized, initialize } = useGlobalStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) return null;

  const runners = progress.allRunners;

  /** 获取最后一次跑步记录 */
  const lastRecord = (user: typeof runners[0]) => {
    const recs = user.runRecords;
    if (!recs || recs.length === 0) return { distance: 0, date: '-' };
    // 按日期降序取最新
    const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
    return { distance: sorted[0].distanceKm, date: sorted[0].date };
  };

  return (
    <div className="global-ranking">
      <div className="gr-header">
        <span className="gr-title">🏆 全民排行榜</span>
        <span className="gr-count">共 {runners.length} 人</span>
      </div>

      {/* 固定高度滚动列表 */}
      <div className="gr-table-wrap">
        <table className="gr-table">
          <thead>
            <tr>
              <th className="gr-th-rank">#</th>
              <th className="gr-th-avatar"></th>
              <th className="gr-th-name">昵称</th>
              <th className="gr-th-total">累计跑量</th>
              <th className="gr-th-last">最近跑量</th>
              <th className="gr-th-date">最近日期</th>
            </tr>
          </thead>
          <tbody>
            {runners.map((r, i) => {
              const last = lastRecord(r);
              return (
                <tr key={r.id} className={`gr-row ${i < 3 ? 'gr-row-top' : ''}`}>
                  <td className="gr-td-rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </td>
                  <td className="gr-td-avatar">{r.avatar}</td>
                  <td className="gr-td-name">{r.nickname}</td>
                  <td className="gr-td-total">{r.totalRunKm.toFixed(0)}</td>
                  <td className="gr-td-last">{last.distance.toFixed(1)}</td>
                  <td className="gr-td-date">{last.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
