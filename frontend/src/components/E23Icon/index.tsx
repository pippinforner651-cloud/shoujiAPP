/**
 * E23跑起来 — 统一图标组件
 * 简约几何线条，2px stroke，圆角端点
 */

interface Props {
  name: 'home' | 'run' | 'rank' | 'profile' | 'runner' | 'route' | 'message' | 'info' | 'back';
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
    default:
      return (
        <svg {...svgProps}>
          <path d="M3 12l2-2m0 0l7-7 7 7" />
        </svg>
      );
  }
}
