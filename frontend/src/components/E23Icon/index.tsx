/**
 * E23跑起来 — 统一图标组件
 * 简约几何线条，2px stroke，圆角端点
 */

export type E23IconName =
  | 'home' | 'run' | 'rank' | 'profile' | 'runner' | 'route' | 'message' | 'info' | 'back'
  | 'calendar' | 'fire' | 'flag' | 'trophy' | 'map' | 'phone' | 'lock' | 'clock'
  | 'mail' | 'edit' | 'check' | 'device' | 'database' | 'shield' | 'chevron'
  | 'user' | 'award' | 'target' | 'settings' | 'logout' | 'book' | 'close'
  | 'download' | 'storage' | 'spark';

interface Props {
  name: E23IconName;
  size?: number;
  color?: string;
  className?: string;
}

/** 简单轻量的SVG图标，直接输出svg元素 */
export default function E23Icon({ name, size = 24, color = 'currentColor', className }: Props) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };

  switch (name) {
    case 'home':
      return (<svg {...svgProps}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>);
    case 'run':
      return (<svg {...svgProps}><circle cx="13" cy="4" r="2" /><path d="M7 21l3-7 4 1 3-5" /><path d="M10 12l-2-3h-2" /><path d="M14 14l1 3h3" /></svg>);
    case 'rank':
      return (<svg {...svgProps}><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 6 7 6" /><path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 6 17 6" /><path d="M4 22h16" /><path d="M10 14.66V18h4v-3.34" /><path d="M12 12l-2 2h4l-2-2z" /></svg>);
    case 'profile':
      return (<svg {...svgProps}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
    case 'runner':
      return (<svg {...svgProps}><circle cx="13" cy="4" r="2" fill={color} /><path d="M7 21l3-7 4 1 3-5" /><path d="M10 12l-2-3h-2" /><path d="M14 14l1 3h3" /></svg>);
    case 'route':
      return (<svg {...svgProps}><circle cx="5" cy="18" r="2" /><circle cx="19" cy="6" r="2" /><path d="M7 18h3a3 3 0 000-6H9a3 3 0 010-6h8" /></svg>);
    case 'message':
      return (<svg {...svgProps}><path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z" /></svg>);
    case 'info':
      return (<svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>);
    case 'back':
      return (<svg {...svgProps}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>);
    case 'calendar':
      return (<svg {...svgProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>);
    case 'fire':
      return (<svg {...svgProps}><path d="M12 22c4.4 0 7-3 7-7.1 0-3.2-1.8-6.2-5.3-9.2.1 2.5-1.1 4.1-2.1 5.1-.2-3.2-1.8-5.7-4-7.8.2 4.3-2.6 6.5-2.6 10.4C5 18.5 8.2 22 12 22z" /><path d="M9.5 17.5c0-1.7 1.1-2.8 2.5-4.5.4 1.7 2.5 2.7 2.5 4.7A2.5 2.5 0 0112 20a2.5 2.5 0 01-2.5-2.5z" /></svg>);
    case 'flag':
      return (<svg {...svgProps}><path d="M5 22V4M5 5h11l-2 4 2 4H5" /></svg>);
    case 'trophy':
      return (<svg {...svgProps}><path d="M8 4h8v4a4 4 0 01-8 0V4zM8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4M12 12v5M8 21h8M9 17h6" /></svg>);
    case 'map':
      return (<svg {...svgProps}><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zM9 3v15M15 6v15" /></svg>);
    case 'phone':
      return (<svg {...svgProps}><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 18h4" /></svg>);
    case 'lock':
      return (<svg {...svgProps}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3M12 14v3" /></svg>);
    case 'clock':
      return (<svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
    case 'mail':
      return (<svg {...svgProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>);
    case 'edit':
      return (<svg {...svgProps}><path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4" /></svg>);
    case 'check':
      return (<svg {...svgProps}><path d="M5 12l4 4L19 6" /></svg>);
    case 'device':
      return (<svg {...svgProps}><rect x="5" y="2" width="14" height="20" rx="3" /><circle cx="12" cy="18" r=".5" fill={color} /></svg>);
    case 'database':
    case 'storage':
      return (<svg {...svgProps}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>);
    case 'shield':
      return (<svg {...svgProps}><path d="M12 3l8 3v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>);
    case 'chevron':
      return (<svg {...svgProps}><path d="M9 6l6 6-6 6" /></svg>);
    case 'user':
      return (<svg {...svgProps}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>);
    case 'award':
      return (<svg {...svgProps}><circle cx="12" cy="8" r="5" /><path d="M8.5 12l-2 9 5.5-3 5.5 3-2-9" /></svg>);
    case 'target':
      return (<svg {...svgProps}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill={color} /></svg>);
    case 'settings':
      return (<svg {...svgProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6v.2h-4V21a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 00.3-1.9A1.7 1.7 0 003 14H2.8v-4H3a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 001.9.3 1.7 1.7 0 001-1.6v-.2h4V3a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.6 1h.2v4H21a1.7 1.7 0 00-1.6 1z" /></svg>);
    case 'logout':
      return (<svg {...svgProps}><path d="M10 4H5a2 2 0 00-2 2v12a2 2 0 002 2h5M16 8l4 4-4 4M20 12H9" /></svg>);
    case 'book':
      return (<svg {...svgProps}><path d="M4 4h7a3 3 0 013 3v13a3 3 0 00-3-3H4V4zM20 4h-3a3 3 0 00-3 3v13a3 3 0 013-3h3V4z" /></svg>);
    case 'close':
      return (<svg {...svgProps}><path d="M6 6l12 12M18 6L6 18" /></svg>);
    case 'download':
      return (<svg {...svgProps}><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>);
    case 'spark':
      return (<svg {...svgProps}><path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z" /></svg>);
    default:
      return (
        <svg {...svgProps}>
          <path d="M3 12l2-2m0 0l7-7 7 7" />
        </svg>
      );
  }
}
