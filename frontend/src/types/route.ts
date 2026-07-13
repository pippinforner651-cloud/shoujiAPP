/* 路线数据 TypeScript 类型 */

/** 单个路线城市节点 */
export interface RouteNode {
  id: string;
  /** 路线顺序（1-48） */
  order: number;
  /** 城市中文名 */
  city: string;
  /** 省份/自治区/直辖市 */
  province: string;
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 到下一个城市的距离（km） */
  nextDistanceKm: number;
  /** 从起点累计的距离（km） */
  totalDistanceKm: number;
  /** 路线难度 */
  difficulty: '普通' | '挑战' | '高原' | '极限';
  /** 代表景点/简介 */
  description: string;
  /** 路线类型：高速公路 | 国道 | sea_transfer */
  routeType: string;
  /** 路线来源（国道/高速名） */
  routeSource: string;
}

/** 路线元信息 */
export interface RouteMeta {
  /** 总城市节点数 */
  totalNodes: number;
  /** 总虚拟里程（km） */
  totalDistanceKm: number;
  /** 跑步比例（跑步1km = 虚拟N km） */
  scaleRatio: number;
  /** 起点城市 */
  startCity: string;
  /** 终点城市 */
  endCity: string;
  /** 路段难度分布 */
  difficultyBreakdown: Record<string, number>;
  /** 路线类型分布 */
  routeTypeBreakdown: Record<string, number>;
}

/** 路线闭环信息 */
export interface RouteClosure {
  from: string;
  to: string;
  distanceKm: number;
  totalDistanceKm: number;
}

/** 海上轮渡段 */
export interface SeaTransfer {
  id: string;
  name: string;
  type: 'sea_transfer';
  fromCity: string;
  fromPort: string;
  crossing: string;
  toPort: string;
  toCity: string;
  seaDistanceKm: number;
  involvedNodes: string[];
  segmentTotalKm: number;
  description: string;
}

/** 完整路线数据结构 */
export interface RouteData {
  meta: RouteMeta;
  nodes: RouteNode[];
  closure: RouteClosure;
  seaTransfer: SeaTransfer[];
}

/** ECharts 地图使用的坐标点 */
export interface MapCoordPoint {
  name: string;
  value: [number, number]; // [lng, lat]
  order: number;
  totalKm: number;
  nextKm: number;
  province: string;
  difficulty: string;
  isStart: boolean;
  isEnd: boolean;
}
