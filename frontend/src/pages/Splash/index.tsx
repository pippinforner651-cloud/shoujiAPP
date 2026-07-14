import { useEffect, useState } from 'react';
import E23BrandMark from '../../components/E23BrandMark';
import { BRAND } from '../../config/brand';

export default function Splash({ onFinish }: { onFinish: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const finishTimer = window.setTimeout(() => setFadeOut(true), 800);
    const exitTimer = window.setTimeout(onFinish, 1050);
    return () => { window.clearTimeout(finishTimer); window.clearTimeout(exitTimer); };
  }, [onFinish]);

  return (
    <div className={`splash-page splash-v1 ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <E23BrandMark size={88} className="splash-brand-mark" />
        <h1 className="splash-title">{BRAND.APP_NAME}</h1>
        <p className="splash-subtitle">{BRAND.SPLASH.main}</p>
        <p className="splash-version">{BRAND.SPLASH.bottom}</p>
      </div>
    </div>
  );
}
