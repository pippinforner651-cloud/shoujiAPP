import { useEffect, useState } from 'react';
import { useCityStore } from '../../store/cityStore';
import type { CityUnlock } from '../../types/city';

/** 难度对应颜色 */
const DIFFICULTY_COLORS: Record<string, string> = {
  '普通': 'rgba(79,195,247,0.8)',
  '挑战': 'rgba(255,183,77,0.8)',
  '高原': 'rgba(171,130,255,0.8)',
  '极限': 'rgba(255,82,82,0.8)',
};

export default function CityBottomSheet() {
  const { alertCity, dismissAlert } = useCityStore();
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  // 监听 alertCity 变化，触发动画
  useEffect(() => {
    if (alertCity) {
      setVisible(true);
      // 下一帧触发进入动画
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      // 动画结束后隐藏
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [alertCity]);

  // 关闭
  const handleDismiss = () => {
    dismissAlert();
  };

  if (!visible && !alertCity) return null;

  const city = alertCity as CityUnlock;
  const diffColor = DIFFICULTY_COLORS[city.difficulty] || 'rgba(255,255,255,0.5)';

  return (
    <>
      {/* 半透明背景遮罩 */}
      <div
        className={`bts-overlay ${animating ? 'show' : ''}`}
        onClick={handleDismiss}
      />

      {/* 底部面板 */}
      <div className={`bts-panel ${animating ? 'show' : ''}`}>
        {/* 拖拽条 */}
        <div className="bts-handle" onClick={handleDismiss}>
          <div className="bts-handle-bar" />
        </div>

        {/* 内容 */}
        <div className="bts-content">
          {/* 城市名称行 */}
          <div className="bts-header">
            <div className="bts-city">
              <span className="bts-city-name">{city.city}</span>
              <span className="bts-order">#{city.order}</span>
            </div>
            <div className="bts-province">{city.province}</div>
          </div>

          {/* 到达信息 */}
          <div className="bts-info">
            <div className="bts-info-item">
              <span className="bts-info-label">到达虚拟里程</span>
              <span className="bts-info-value">{city.unlockKm.toLocaleString()} km</span>
            </div>
            <div className="bts-info-item">
              <span className="bts-info-label">路线难度</span>
              <span className="bts-info-value" style={{ color: diffColor }}>
                {city.difficulty}
              </span>
            </div>
            <div className="bts-info-item">
              <span className="bts-info-label">到达时间</span>
              <span className="bts-info-value">
                {new Date(city.unlockedAt).toLocaleString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* 景点介绍 */}
          <div className="bts-desc">
            <div className="bts-desc-label">📍 代表景点</div>
            <div className="bts-desc-text">{city.description}</div>
          </div>
        </div>

        {/* 关闭按钮 */}
        <button className="bts-close" onClick={handleDismiss}>
          继续旅程 →
        </button>
      </div>
    </>
  );
}
