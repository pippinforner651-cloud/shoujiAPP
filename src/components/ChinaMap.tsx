import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import outline from '../data/china_outline.json';
import type { MapPack, RouteNode } from '../data/route';

interface Props {
  pack: MapPack;
  progressKm: number;         // 累计（1:1 真实公里）
  onSelectNode?: (n: RouteNode) => void;
  selectedNode?: RouteNode | null;
}

const LAT0 = 35;
const BLUE = '#3B82F6';   // 未跑路段
const ORANGE = '#FF6B1A'; // 已跑路段

export default function ChinaMap({ pack, progressKm, onSelectNode, selectedNode }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 800 });
  const baseBox = useRef({ x: 0, y: 0, w: 1000, h: 800 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef<number | null>(null);
  const moved = useRef(false);

  const { paths, routePts, donePts, cur, bounds } = useMemo(() => {
    const proj = (lon: number, lat: number): [number, number] => [lon * Math.cos((LAT0 * Math.PI) / 180), -lat];
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
    const b = { x: minX - padX, y: minY - padY, w: maxX - minX + padX * 2, h: maxY - minY + padY * 2 };
    return { paths, routePts: nodes, donePts: done.join(' '), cur: { x: curX, y: curY }, bounds: b };
  }, [pack, progressKm]);

  useEffect(() => {
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

  const applyZoom = useCallback((f: number, cx?: number, cy?: number) => {
    setViewBox((v) => {
      const c = cx !== undefined && cy !== undefined
        ? (() => { const svg = svgRef.current!; const r = svg.getBoundingClientRect(); return { x: v.x + ((cx - r.left) / r.width) * v.w, y: v.y + ((cy - r.top) / r.height) * v.h }; })()
        : { x: v.x + v.w / 2, y: v.y + v.h / 2 };
      const w = Math.min(Math.max(v.w * f, baseBox.current.w / 6), baseBox.current.w * 1.2);
      const h = w * (baseBox.current.h / baseBox.current.w);
      return { x: c.x - (c.x - v.x) * (w / v.w), y: c.y - (c.y - v.y) * (h / v.h), w, h };
    });
  }, []);

  // ---- 触控：单指拖动 / 两指捏合缩放 ----
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prevPt = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      // 两指捏合
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current && d > 0) {
        const f = pinchDist.current / d;
        applyZoom(f, (a.x + b.x) / 2, (a.y + b.y) / 2);
        moved.current = true;
      }
      pinchDist.current = d;
      return;
    }
    // 单指拖动
    const dx = e.clientX - prevPt.x, dy = e.clientY - prevPt.y;
    if (Math.abs(dx) + Math.abs(dy) < 2) return;
    moved.current = true;
    const svg = svgRef.current!; const r = svg.getBoundingClientRect();
    setViewBox((v) => ({ ...v, x: v.x - (dx / r.width) * v.w, y: v.y - (dy / r.height) * v.h }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (moved.current) return;
    const pt = toSvg(e.clientX, e.clientY);
    let best: (typeof routePts)[0] | null = null, bd = Infinity;
    for (const n of routePts) {
      const d = (n.x - pt.x) ** 2 + (n.y - pt.y) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    const threshold = (viewBox.w * 0.05) ** 2;
    if (best && bd < threshold && onSelectNode) onSelectNode(best);
  };

  const sel = selectedNode ? routePts.find((n) => n.id === selectedNode.id) : null;
  const u = viewBox.w / 1000;

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full touch-none"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onClick={handleClick}
        onWheel={(e) => applyZoom(e.deltaY > 0 ? 1.15 : 0.87, e.clientX, e.clientY)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* 中国轮廓 */}
        <g>
          {paths.map((d, i) => (
            <path key={i} d={d} fill="#EAF3EE" stroke="#B9CFC4" strokeWidth={1.1 * u} />
          ))}
        </g>
        {/* 未跑路线（蓝色） */}
        <polyline
          points={routePts.map((n) => `${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(' ')}
          fill="none" stroke={BLUE} strokeWidth={3 * u} strokeLinecap="round" strokeLinejoin="round" opacity={0.55}
        />
        {/* 已跑路线（橙色覆盖） */}
        <polyline points={donePts} fill="none" stroke={ORANGE} strokeWidth={5 * u} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
        <polyline points={donePts} fill="none" stroke="#FFD166" strokeWidth={1.8 * u} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        {/* 站点 */}
        {routePts.map((n) => (
          <circle key={n.id} cx={n.x} cy={n.y} r={n.id === 0 ? 6 * u : 3 * u}
            fill={n.cumKm <= progressKm ? ORANGE : '#fff'} stroke={n.cumKm <= progressKm ? '#fff' : BLUE} strokeWidth={1.4 * u} />
        ))}
        {/* 起点标记 */}
        <text x={routePts[0].x} y={routePts[0].y - 10 * u} fontSize={12.5 * u} textAnchor="middle" fill="#0F766E" fontWeight="700">北大汇丰·起点</text>
        {/* 当前位置：脉冲圈 + 跑动小人 */}
        <circle cx={cur.x} cy={cur.y} r={10 * u} fill={ORANGE} opacity={0.25}>
          <animate attributeName="r" values={`${7 * u};${18 * u};${7 * u}`} dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0.05;0.35" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <g>
          <animateTransform attributeName="transform" type="translate" values={`0 0; 0 ${-3 * u}; 0 0`} dur="0.5s" repeatCount="indefinite" />
          <text x={cur.x} y={cur.y + 6 * u} fontSize={20 * u} textAnchor="middle">🏃</text>
        </g>
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
        <button onClick={() => applyZoom(0.8)} className="w-9 h-9 rounded-full bg-white shadow-md text-lg font-bold text-slate-600 active:bg-slate-100">＋</button>
        <button onClick={() => applyZoom(1.25)} className="w-9 h-9 rounded-full bg-white shadow-md text-lg font-bold text-slate-600 active:bg-slate-100">－</button>
        <button onClick={() => setViewBox(baseBox.current)} className="w-9 h-9 rounded-full bg-white shadow-md text-xs text-slate-600 active:bg-slate-100">全局</button>
      </div>
    </div>
  );
}
