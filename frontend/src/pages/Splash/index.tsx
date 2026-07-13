import { useEffect, useState } from 'react';

interface Props {
  onFinish: () => void;
}

export default function Splash({ onFinish }: Props) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 400);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`splash-page ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <div className="splash-icon">🌏</div>
        <h1 className="splash-title">全民环游中国</h1>
        <p className="splash-subtitle">虚拟跑步地图</p>
        <p className="splash-footer">开始你的旅程</p>
      </div>
    </div>
  );
}
