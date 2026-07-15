import { useState } from 'react';
import { useGlobalStore } from '../../store/globalProgressStore';
import { renderGlobalShareCard } from './shareCanvas';

export default function GlobalShareCard() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { progress, initialized, initialize, status, error } = useGlobalStore();

  // 确保已初始化
  if (!initialized) {
    initialize();
  }

  const handleShare = async () => {
    if (!initialized || status !== 'ready') return;
    setLoading(true);
    try {
      const topRunner = progress.allRunners[0];
      const url = await renderGlobalShareCard({
        participantCount: progress.participantCount,
        totalRealKm: progress.totalRealKm,
        totalVirtualKm: progress.totalVirtualKm,
        currentCity: progress.currentCity,
        completionPct: progress.completionRate,
        topRunnerName: topRunner?.nickname || '-',
        topRunnerKm: topRunner?.totalRunKm || 0,
      });
      setPreviewUrl(url);
    } catch (err) {
      console.error('生成分享图失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="share-card-wrap">
      <button className="share-btn global-share-btn" onClick={handleShare} disabled={loading || status !== 'ready'}>
        {loading ? '⏳ 生成中...' : status === 'ready' ? '📤 分享全民进度' : (error ?? '多人服务暂未启用')}
      </button>

      {previewUrl && (
        <div className="share-preview-overlay" onClick={() => setPreviewUrl(null)}>
          <div className="share-preview-modal" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="分享卡片" className="share-preview-img" />
            <div className="share-preview-actions">
              <a href={previewUrl} download="全民环游进度.png" className="share-download-btn">
                💾 保存图片
              </a>
              <button className="share-close-btn" onClick={() => setPreviewUrl(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
