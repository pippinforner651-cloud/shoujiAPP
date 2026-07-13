/* 路线几何类型 */

/** 路线段类型 */
export type SegmentType = 'road' | 'special_g219' | 'sea_transfer' | 'fallback_linear';

/** 路线段几何 */
export interface RouteSegmentGeometry {
  id: string;
  order: number;
  type: SegmentType;
  from: string;
  from_city: string;
  to: string;
  to_city: string;
  distance_km: number;
  duration_min: number;
  route_source?: string;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  note?: string;
}

/** 完整路线几何元信息 */
export interface RouteGeometryMeta {
  name: string;
  source: string;
  profile: string;
  overview: string;
  total_segments: number;
  total_distance_km: number;
  road_segments: number;
  sea_transfer_segments: number;
  fallback_segments: number;
}

/** 路线几何数据 */
export interface RouteGeometryData {
  route_version: string;
  geometry_version: string;
  meta: RouteGeometryMeta;
  segments: RouteSegmentGeometry[];
}

/** 已分段处理的路线 */
export interface ProcessedGeometry {
  /** 路段索引映射：segments[i] 对应 route_master.nodes[i]→nodes[i+1] */
  segments: RouteSegmentGeometry[];
  /** 完整路线坐标序列（所有 geometry 坐标合并） */
  allCoords: [number, number][];
  /** 每段累积里程（用于二分查找定位） */
  cumulativeKm: number[];
}
