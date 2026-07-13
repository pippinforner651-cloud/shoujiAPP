import { useState } from 'react';
import { fullSync } from '../../services/cloud/syncService';
import type { SyncResult } from '../../services/cloud/syncService';

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    const res = await fullSync();
    setResult(res);
    setSyncing(false);
    setTimeout(() => setResult(null), 8000);
  };

  return (
    <div className="sync-wrap">
      <button className="sync-btn" onClick={handleSync} disabled={syncing}>
        {syncing ? '⏳ 同步中...' : '☁️ 同步数据'}
      </button>

      {result && result.status === 'success' && (
        <div className="sync-result success">
          ✅ 同步完成
          &nbsp;↑{result.uploaded} &nbsp;↓{result.downloaded} &nbsp;合并{result.merged}
          &nbsp;· {result.timestamp.slice(11, 19)}
        </div>
      )}

      {result && result.status === 'error' && (
        <div className="sync-result error">
          ❌ {result.message}
        </div>
      )}
    </div>
  );
}
