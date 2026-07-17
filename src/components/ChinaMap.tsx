import { useMemo, useRef, useState, useCallback } from 'react';
import outline from '../data/china_outline.json';
import type { MapPack, RouteNode } from '../data/route';

interface Props {
  pack: MapPack;
  progressKm: number;         // 班级累计（1:1 真实公里）
  onSelectNode?: (n: RouteNode) => void;
  selectedNode?: RouteNode | null;
}

const LAT0 = 35; // 投影基准纬度

export default function ChinaMap({ pack, progressKm, onSelectNode, selectedNode }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 800 });
  const baseBox = useRef({ x: 0, y: 0, w: 1000, h: 800 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const { paths, routePts, donePts, cur, bounds } = useMemo(() => {
    const proj = (lon: number, lat: number): [number, number] => [lon * Math.cos((LAT0 * Math.PI) / 180), -lat];
    // 轮廓边界
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const paths: string[] = [];
    for (const poly of (outline as { polys: number[][][] }).polys) {
      let d = '';
      poly.forEach(([lon, lat], i) => {
        const [x, y] = proj(lon, lat);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      });
      paths.push(d + 'Z');
    }
    const nodes = pack.nodes.map((n) => {
      const [x, y] = proj(n.lon, n.lat);
      return { ...n, x, y };
    });
    // 已完成路径点（1:1）
    const done: string[] = [];
    let curX = nodes[0].x, curY = nodes[0].y;
    const km = Math.max(0, Math.min(progressKm, pack.totalKm));
    let prev = nodes[0];
    done.push(`${prev.x.toFixed(1)},${prev.y.toFixed(1)}`);
    for (let i = 1; i < nodes.length; i++) {
      const n = nodes[i];
      const segStart = n.cumKm - n.segKm;
      if (km >= n.cumKm) {
        done.push(`${n.x.toFixed(1)},${n.y.toFixed(1)}`);
        prev = n; curX = n.x; curY = n.y;
        continue;
      }
      const p = n.segKm === 0 ? 0 : (km - segStart) / n.segKm;
      curX = prev.x + (n.x - prev.x) * p;
      curY = prev.y + (n.y - prev.y) * p;
      done.push(`${curX.toFixed(1)},${curY.toFixed(1)}`);
      break;
    }
    const padX = (maxX - minX) * 0.06, padY = (maxY - minY) * 0.06;
    const b = { x: minX - padX, y: minY - padY, w: (maxX - minX) + padX * 2, h: (maxY - minY) + padY * 2 };
    return {
      paths,
      routePts: nodes,
      donePts: done.join(' '),
      cur: { x: curX, y: curY },
      bounds: b,
    };
  }, [pack, progressKm]);

  // 初始化 viewBox
  useMemo(() => {
    baseBox.current = bounds;
    setViewBox(bounds);
  }, [bounds]);

  const toSvg = useCallback((cx: number, cy: number) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return {
      x: viewBox.x + ((cx - r.left) / r.width) * viewBox.w,
      y: viewBox.y + ((cy - r.top) / r.height) * viewBox.h,
    };
  }, [viewBox]);

  const zoom = (f: number, cx?: number, cy?: number) => {
    const c = cx !== undefined && cy !== undefined ? toSvg(cx, cy) : { x: viewBox.x + viewBox.w / 2, y: viewBox.y + viewBox.h / 2 };
    const w = Math.min(Math.max(viewBox.w * f, baseBox.current.w / 6), baseBox.current.w * 1.2);
    const h = w * (baseBox.current.h / baseBox.current.w);
    setViewBox({ x: c.x - (c.x - viewBox.x) * (w / viewBox.w), y: c.y - (c.y - viewBox.y) * (h / viewBox.h), w, h });
  };

  const handleClick = (e: React.MouseEvent) => {
    if (drag.current) return;
    const pt = toSvg(e.clientX, e.clientY);
    let best: (typeof routePts)[0] | null = null, bd = Infinity;
    for (const n of routePts) {
      const d = (n.x - pt.x) ** 2 + (n.y - pt.y) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    const threshold = (viewBox.w * 0.035) ** 2;
    if (best && bd < threshold * 4 && onSelectNode) onSelectNode(best);
  };

  const sel = selectedNode ? routePts.find((n) => n.id === selectedNode.id) : null;
  const u = viewBox.w / 1000; // 缩放无关单位

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full touch-none"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onClick={handleClick}
        onWheel={(e) => zoom(e.deltaY > 0 ? 1.15 : 0.87, e.clientX, e.clientY)}
        onPointerDown={(e) => { drag.current = null; (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY }; }}
        onPointerMove={(e) => {
          if (!drag.current || e.buttons === 0) { drag.current = null; return; }
          const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
          if (Math.abs(dx) + Math.abs(dy) < 3) return;
          const svg = svgRef.current!; const r = svg.getBoundingClientRect();
          setViewBox((v) => ({ ...v, x: v.x - (dx / r.width) * v.w, y: v.y - (dy / r.height) * v.h }));
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => setTimeout(() => { drag.current = null; }, 0)}
      >
        {/* 中国轮廓 */}
        <g>
          {paths.map((d, i) => (
            <path key={i} d={d} fill="#EAF3EE" stroke="#B9CFC4" strokeWidth={1.1 * u} />
          ))}
        </g>
        {/* 完整路线（未完成部分） */}
        <polyline
          points={routePts.map((n) => `${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(' ')}
          fill="none" stroke="#94A3B8" strokeWidth={2.2 * u} strokeDasharray={`${6 * u} ${5 * u}`} strokeLinecap="round" strokeLinejoin="round" opacity={0.8}
        />
        {/* 已完成路线 1:1 */}
        <polyline points={donePts} fill="none" stroke="#FF6B1A" strokeWidth={4.5 * u} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
        <polyline points={donePts} fill="none" stroke="#FFD166" strokeWidth={1.6 * u} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        {/* 站点 */}
        {routePts.map((n) => (
          <circle key={n.id} cx={n.x} cy={n.y} r={n.id === 0 ? 6 * u : 3.2 * u}
            fill={n.cumKm <= progressKm ? '#FF6B1A' : '#fff'} stroke={n.cumKm <= progressKm ? '#fff' : '#64748B'} strokeWidth={1.4 * u}
            className="cursor-pointer" />
        ))}
        {/* 起点标记 */}
        <text x={routePts[0].x} y={routePts[0].y - 10 * u} fontSize={13 * u} textAnchor="middle" fill="#0F766E" fontWeight="700">深圳·起点</text>
        {/* 当前位置脉冲 */}
        <circle cx={cur.x} cy={cur.y} r={10 * u} fill="#FF6B1A" opacity={0.25}>
          <animate attributeName="r" values={`${6 * u};${16 * u};${6 * u}`} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx={cur.x} cy={cur.y} r={5.5 * u} fill="#FF6B1A" stroke="#fff" strokeWidth={2 * u} />
        {/* 选中站点 */}
        {sel && (
          <g>
            <circle cx={sel.x} cy={sel.y} r={8 * u} fill="none" stroke="#0EA5E9" strokeWidth={2 * u} />
            <text x={sel.x} y={sel.y - 12 * u} fontSize={13 * u} textAnchor="middle" fill="#0369A1" fontWeight="700">{sel.name}</text>
          </g>
        )}
      </svg>
      {/* 缩放控制 */}
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button onClick={() => zoom(0.8)} className="w-9 h-9 rounded-full bg-white shadow-md text-lg font-bold text-slate-600 active:bg-slate-100">＋</button>
        <button onClick={() => zoom(1.25)} className="w-9 h-9 rounded-full bg-white shadow-md text-lg font-bold text-slate-600 active:bg-slate-100">－</button>
        <button onClick={() => setViewBox(baseBox.current)} className="w-9 h-9 rounded-full bg-white shadow-md text-xs text-slate-600 active:bg-slate-100">全局</button>
      </div>
    </div>
  );
}
