/* 跑者位置计算相关类型 */

import type { RouteNode } from '../../types/route';

/** 跑者在地图上的位置信息 */
export interface RunnerPosition {
  /** 经纬度坐标 [lng, lat] */
  position: [number, number];
  /** 当前所在路段起点城市 */
  fromCity: string;
  /** 当前所在路段终点城市 */
  toCity: string;
  /** 在该路段内的完成比例（0-1） */
  ratio: number;
  /** 当前路段起点节点 */
  fromNode: RouteNode | null;
  /** 当前路段终点节点 */
  toNode: RouteNode | null;
  /** 当前已跑虚拟公里 */
  routeKm: number;
  /** 附近景点描述 */
  nearbyDescription: string;
}
