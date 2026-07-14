import { useEffect, useState } from 'react';
import { BRAND } from '../../config/brand';

export default function Splash({ onFinish }: { onFinish: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 400);
    }, 1800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`splash-page ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <div className="splash-icon-wrapper">
          <svg viewBox="0 0 200 200" className="splash-icon-svg">
            <defs>
              <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D2B45" />
                <stop offset="100%" stopColor="#1E3A5F" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="200" height="200" rx="44" ry="44" fill="url(#bgGrad)" />
            <ellipse cx="100" cy="160" rx="120" ry="40" fill="#F28C22" />
            <ellipse cx="80" cy="145" rx="80" ry="35" fill="#FAD7A0" />
            <ellipse cx="100" cy="135" rx="55" ry="30" fill="#FFF4E0" />
            <circle cx="100" cy="110" r="18" fill="#FFE6B4" opacity="0.85" />
            <text x="100" y="48" textAnchor="middle" fill="#FFFFFF" fontSize="40" fontWeight="900" fontFamily="Arial Black, sans-serif">E23</text>
            <text x="100" y="72" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="700">跑起来</text>
            <g fill="#0D2B45">
              <circle cx="115" cy="148" r="3.5" />
              <path d="M115 151 L118 162 L116 170 M118 162 L112 168 M118 162 L123 167 M118 158 L114 162 M118 158 L122 162" stroke="#0D2B45" strokeWidth="1.5" fill="none" />
              <circle cx="92" cy="150" r="3" />
              <path d="M92 153 L94 162 L92 170 M94 162 L89 168 M94 162 L98 167 M94 158 L91 161 M94 158 L97 161" stroke="#0D2B45" strokeWidth="1.3" fill="none" />
              <circle cx="72" cy="152" r="2.5" />
              <path d="M72 154 L74 162 L72 169 M74 162 L70 168 M74 162 L77 167 M74 158 L71 161 M74 158 L77 161" stroke="#0D2B45" strokeWidth="1.1" fill="none" />
            </g>
          </svg>
        </div>
        <h1 className="splash-title">{BRAND.APP_NAME}</h1>
        <p className="splash-subtitle">{BRAND.SPLASH.main}</p>
        <p className="splash-version">{BRAND.SPLASH.bottom}</p>
      </div>
    </div>
  );
}
