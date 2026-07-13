import { useState } from 'react';
import { useRunStore } from '../../store/runStore';
import { useProgressStore } from '../../store/progressStore';
import { renderPersonalShareCard } from './shareCanvas';

export default function PersonalShareCard() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stats = useRunStore((s) => s.stats);
  const progress = useProgressStore((s) => s.info);

  // 模拟个人排名（在 100 人中的位置）
  const mockRank = 42;

  const handleShare = async () => {
    setLoading(true);
    try {
      const currentCityName = progress.currentCity?.city || '深圳';
      const url = await renderPersonalShareCard({
        nickname: localStorage.getItem('user_nickname') || '跑者',
        avatar: localStorage.getItem('user_avatar') || '🏃',
        currentCity: currentCityName,
        roadName: currentCityName,
        totalRunKm: stats.totalDistanceKm,
        completionPct: parseFloat(progress.completionRate.toFixed(1)),
        totalVirtualKm: progress.virtualKm,
        rank: mockRank,
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
      <button className="share-btn" onClick={handleShare} disabled={loading}>
        {loading ? '⏳ 生成中...' : '📤 分享我的旅程'}
      </button>

      {previewUrl && (
        <div className="share-preview-overlay" onClick={() => setPreviewUrl(null)}>
          <div className="share-preview-modal" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="分享卡片" className="share-preview-img" />
            <div className="share-preview-actions">
              <a href={previewUrl} download="我的环游旅程.png" className="share-download-btn">
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
