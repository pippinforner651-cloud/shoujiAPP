/**
 * 路线几何数据加载器
 * 加载 route_geometry_v1.json 并提供类型安全访问
 */
import rawGeometry from '../../../data/route_geometry/route_geometry_v1.json';
import type { RouteGeometryData, RouteSegmentGeometry, ProcessedGeometry } from '../types/geometry';

/** 缓存处理后的几何 */
let _cached: ProcessedGeometry | null = null;

/** 预处理：合并坐标 + 计算累计 */
function processGeometry(data: RouteGeometryData): ProcessedGeometry {
  const segments = data.segments;
  const allCoords: [number, number][] = [];
  const cumulativeKm: number[] = [];
  let accum = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const coords = seg.geometry.coordinates as [number, number][];

    // 第一个段从头开始，后续段跳过第一个点避免重复（上一个段已包含）
    if (i === 0) {
      allCoords.push(...coords);
    } else {
      allCoords.push(...coords.slice(1));
    }

    accum += seg.distance_km;
    cumulativeKm.push(accum);
  }

  return { segments, allCoords, cumulativeKm };
}

/** 获取处理后的路线几何数据 */
export function getGeometryData(): ProcessedGeometry {
  if (!_cached) {
    _cached = processGeometry(rawGeometry as unknown as RouteGeometryData);
  }
  return _cached;
}

/** 获取指定城市间的几何段 */
export function getSegmentGeometry(fromCity: string, toCity: string): RouteSegmentGeometry | undefined {
  const { segments } = getGeometryData();
  return segments.find((s) => s.from_city === fromCity && s.to_city === toCity);
}

/** 获取所有段的几何 */
export function getGeometrySegments(): RouteSegmentGeometry[] {
  return getGeometryData().segments;
}

/** 获取完整路线坐标序列 */
export function getAllRouteGeometry(): [number, number][] {
  return getGeometryData().allCoords;
}

/**
 * 根据虚拟公里获取在该段内的精确位置
 * @param virtualKm 当前虚拟公里（基于 route_master 累计）
 * @param segIndex 段索引
 * @param segDistKm 该段总里程（OSRM 实际距离）
 * @param ratio 在该段内的比例 (0-1)
 * @returns [lng, lat]
 */
export function interpolateOnGeometry(
  segIndex: number,
  _segDistKm: number,
  ratio: number
): [number, number] {
  const { segments } = getGeometryData();
  if (segIndex < 0 || segIndex >= segments.length) {
    return [114.07, 22.54]; // fallback 深圳
  }

  const coords = segments[segIndex].geometry.coordinates as [number, number][];
  if (coords.length < 2) return coords[0] || [114.07, 22.54];

  // 将 ratio 映射到坐标点之间
  const totalSegments = coords.length - 1;
  const pointIndex = Math.min(Math.floor(ratio * totalSegments), totalSegments - 1);
  const pointRatio = ratio * totalSegments - pointIndex;

  const from = coords[pointIndex];
  const to = coords[Math.min(pointIndex + 1, coords.length - 1)];

  return [
    from[0] + (to[0] - from[0]) * pointRatio,
    from[1] + (to[1] - from[1]) * pointRatio,
  ];
}
