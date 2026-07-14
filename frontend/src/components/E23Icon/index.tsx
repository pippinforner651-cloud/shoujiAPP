/**
 * E23跑起来 — 统一图标组件
 *
 * 风格：简约几何线条，2px stroke，圆角端点
 * 尺寸：默认 24×24，支持自定义
 */

/** 图标类型 */
type IconName = 'home' | 'run' | 'rank' | 'profile' | 'map' | 'flag' | 'target' | 'runner' | 'e23';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
}

export default function E23Icon({ name, size = 24, color = 'currentColor', className }: Props) {
  const s: Record<string, number | string> = { width: size, height: size, display: 'block' };

  const icons: Record<IconName, React.ReactElement> = {
    home: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    run: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13" cy="4" r="2" />
        <path d="M7 21l3-7 4 1 3-5" />
        <path d="M10 12l-2-3h-2" />
        <path d="M14 14l1 3h3" />
      </svg>
    ),
    rank: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 6 7 6" />
        <path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 6 17 6" />
        <path d="M4 22h16" />
        <path d="M10 14.66V18h4v-3.34" />
        <path d="M12 12l-2 2h4l-2-2z" />
      </svg>
    ),
    profile: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    map: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
    flag: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
    target: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    runner: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13" cy="4" r="2" fill={color} />
        <path d="M7 21l3-7 4 1 3-5" />
        <path d="M10 12l-2-3h-2" />
        <path d="M14 14l1 3h3" />
      </svg>
    ),
    e23: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="1" y="1" width="22" height="22" rx="5" fill="#0D2B45" />
        <text x="12" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" fontFamily="Arial Black, sans-serif">E23</text>
      </svg>
    ),
  };

  return (
    <span className={className} style={s}>
      {icons[name] || icons.home}
    </span>
  );
}
