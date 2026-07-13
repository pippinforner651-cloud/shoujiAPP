/**
 * 路线数据加载器
 * 从冻结的 route_master_v1.json 读取原始数据，
 * 转换为前端使用的 RouteData 类型。
 */
import rawRouteData from '../../../data/route_master_v1.json';
import type { RouteData, RouteNode, RouteMeta, RouteClosure, SeaTransfer } from '../types/route';

/** 难度映射（JSON snake_case → camelCase） */
const DIFFICULTY_MAP: Record<string, RouteNode['difficulty']> = {
  '普通': '普通',
  '挑战': '挑战',
  '高原': '高原',
  '极限': '极限',
};

/** 解析原始 JSON 为 RouteNode */
function parseNode(raw: Record<string, unknown>): RouteNode {
  return {
    id: raw.id as string,
    order: raw.order as number,
    city: raw.city as string,
    province: raw.province as string,
    latitude: raw.latitude as number,
    longitude: raw.longitude as number,
    nextDistanceKm: raw.next_distance_km as number,
    totalDistanceKm: raw.total_distance_km as number,
    difficulty: DIFFICULTY_MAP[raw.difficulty as string] ?? '普通',
    description: raw.description as string,
    routeType: raw.route_type as string,
    routeSource: raw.route_source as string,
  };
}

/** 解析 meta */
function parseMeta(raw: Record<string, unknown>): RouteMeta {
  const stats = raw.statistics as Record<string, unknown> | undefined;
  return {
    totalNodes: raw.total_nodes as number,
    totalDistanceKm: raw.total_distance_km as number,
    scaleRatio: raw.scale_ratio as number,
    startCity: raw.start_city as string,
    endCity: raw.end_city as string,
    difficultyBreakdown: (stats?.difficulty_breakdown ?? {}) as Record<string, number>,
    routeTypeBreakdown: (stats?.route_type_breakdown ?? {}) as Record<string, number>,
  };
}

/** 解析 closure */
function parseClosure(raw: Record<string, unknown>): RouteClosure {
  return {
    from: raw.from as string,
    to: raw.to as string,
    distanceKm: raw.distance_km as number,
    totalDistanceKm: raw.total_distance_km as number,
  };
}

/** 解析 sea_transfer */
function parseSeaTransfers(raw: unknown[]): SeaTransfer[] {
  return (raw ?? []).map((item) => {
    const s = item as Record<string, unknown>;
    return {
      id: s.id as string,
      name: s.name as string,
      type: 'sea_transfer',
      fromCity: s.from_city as string,
      fromPort: s.from_port as string,
      crossing: s.crossing as string,
      toPort: s.to_port as string,
      toCity: s.to_city as string,
      seaDistanceKm: s.sea_distance_km as number,
      involvedNodes: (s.involved_nodes ?? []) as string[],
      segmentTotalKm: s.segment_total_km as number,
      description: s.description as string,
    };
  });
}

/** 是否 JSON 对象 */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 加载并转换路线数据
 * 返回完整 RouteData，包含类型安全的节点、元信息、闭环、轮渡
 */
export function loadRouteData(): RouteData {
  const root = rawRouteData as Record<string, unknown>;
  const metaRaw = isObject(root.meta) ? root.meta : {};
  const nodesRaw = Array.isArray(root.nodes) ? root.nodes : [];
  const closureRaw = isObject(root.closure) ? root.closure : {};
  const seaRaw = Array.isArray(root.sea_transfer) ? root.sea_transfer : [];

  return {
    meta: parseMeta(metaRaw),
    nodes: nodesRaw.map((n) => parseNode(isObject(n) ? n : {})),
    closure: parseClosure(closureRaw),
    seaTransfer: parseSeaTransfers(seaRaw),
  };
}

/** 单例：缓存加载结果，避免重复解析 */
let _cached: RouteData | null = null;

export function getRouteData(): RouteData {
  if (!_cached) {
    _cached = loadRouteData();
  }
  return _cached;
}

/** 获取所有城市坐标（用于 ECharts 散点图） */
export function getCityCoords() {
  const { nodes, meta } = getRouteData();
  const startCityName = meta.startCity;

  return nodes.map((node) => ({
    name: node.city,
    value: [node.longitude, node.latitude] as [number, number],
    order: node.order,
    totalKm: node.totalDistanceKm,
    nextKm: node.nextDistanceKm,
    province: node.province,
    difficulty: node.difficulty,
    isStart: node.city === startCityName,
    isEnd: node.order === nodes.length,
    description: node.description,
  }));
}

/** 获取路线连线坐标对（[起点经度, 起点纬度, 终点经度, 终点纬度]） */
export function getRouteLines() {
  const { nodes } = getRouteData();
  const lines: Array<{
    coords: [[number, number], [number, number]];
    fromName: string;
    toName: string;
    distanceKm: number;
  }> = [];

  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i];
    const to = nodes[i + 1];
    lines.push({
      coords: [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude],
      ],
      fromName: from.city,
      toName: to.city,
      distanceKm: from.nextDistanceKm,
    });
  }

  // 闭合路线：最后一个节点 → 第一个节点（深圳闭环）
  const last = nodes[nodes.length - 1];
  const first = nodes[0];
  lines.push({
    coords: [
      [last.longitude, last.latitude],
      [first.longitude, first.latitude],
    ],
    fromName: last.city,
    toName: first.city,
    distanceKm: last.nextDistanceKm,
  });

  return lines;
}
