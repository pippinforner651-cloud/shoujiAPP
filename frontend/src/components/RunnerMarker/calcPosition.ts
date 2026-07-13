/**
 * 跑者位置计算（基于真实道路几何）
 *
 * 算法：
 * 1. 根据 route_master 累计距离找到所在路段
 * 2. 利用 route_geometry 的坐标点做分段插值
 * 3. 输出跑者在真实道路上的精确位置
 */

import { getRouteData } from '../../data/routeLoader';
import { getGeometryData, interpolateOnGeometry } from '../../data/routeGeometryLoader';
import type { RunnerPosition } from './types';

export function calcRunnerPosition(virtualKm: number): RunnerPosition {
  const { nodes, meta } = getRouteData();
  const geo = getGeometryData();

  const total = meta.totalDistanceKm;

  const defaultPos: RunnerPosition = {
    position: [114.07, 22.54],
    fromCity: '', toCity: '', ratio: 0,
    fromNode: null, toNode: null,
    routeKm: virtualKm, nearbyDescription: '',
  };

  if (!nodes.length || !geo.segments.length) return defaultPos;

  // 未起步
  if (virtualKm <= 0) {
    const firstNode = nodes[0];
    const firstSeg = geo.segments[0];
    const fc = firstSeg.geometry.coordinates as [number, number][];
    return {
      position: fc[0] || [firstNode.longitude, firstNode.latitude],
      fromCity: firstNode.city, toCity: firstNode.city,
      ratio: 0, fromNode: firstNode,
      toNode: nodes.length > 1 ? nodes[1] : firstNode,
      routeKm: 0, nearbyDescription: firstNode.description,
    };
  }

  // 已完成全程
  if (virtualKm >= total) {
    const lastNode = nodes[nodes.length - 1];
    const lastSeg = geo.segments[geo.segments.length - 1];
    const lc = lastSeg.geometry.coordinates as [number, number][];
    return {
      position: lc[lc.length - 1] || [lastNode.longitude, lastNode.latitude],
      fromCity: lastNode.city, toCity: '🏁 完成',
      ratio: 1, fromNode: lastNode, toNode: null,
      routeKm: total, nearbyDescription: '🎉 恭喜完成全程环游中国！',
    };
  }

  // 正常定位：找到所在路段
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i];
    const to = nodes[i + 1];
    const segStart = from.totalDistanceKm;
    const segEnd = to.totalDistanceKm;

    if (virtualKm >= segStart && virtualKm < segEnd) {
      const segLen = segEnd - segStart;
      const ratio = segLen > 0 ? (virtualKm - segStart) / segLen : 0;

      // 在真实道路上插值
      const segDist = geo.segments[Math.min(i, geo.segments.length - 1)]?.distance_km || segLen;
      const position = interpolateOnGeometry(i, segDist, ratio);

      // 取更近的城市描述
      const desc = ratio < 0.5 ? from.description : to.description;

      // 段类型描述
      const segType = geo.segments[i]?.type || 'road';
      const typeLabel: Record<string, string> = {
        road: '高速公路/国道',
        special_g219: 'G219新藏公路',
        sea_transfer: '海上轮渡',
        fallback_linear: '近似路线',
      };

      return {
        position,
        fromCity: from.city,
        toCity: to.city,
        ratio,
        fromNode: from,
        toNode: to,
        routeKm: virtualKm,
        nearbyDescription: `${typeLabel[segType] || '道路'} · ${desc}`,
      };
    }
  }

  return defaultPos;
}
