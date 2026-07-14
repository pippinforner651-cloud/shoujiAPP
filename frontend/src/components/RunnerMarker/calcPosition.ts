/** 跑者位置计算：路线段判定统一来自 routeProgress。 */
import { getRouteData } from '../../data/routeLoader';
import { getGeometryData, interpolateOnGeometry } from '../../data/routeGeometryLoader';
import { calculateRouteProgressFromVirtual } from '../../utils/routeProgress';
import type { RunnerPosition } from './types';

export function calcRunnerPosition(virtualKm: number): RunnerPosition {
  const { nodes, meta, closure } = getRouteData();
  const geo = getGeometryData();
  const progress = calculateRouteProgressFromVirtual(virtualKm);
  const firstNode = nodes[0];
  const fallback: RunnerPosition = {
    position: [114.07, 22.54], fromCity: '', toCity: '', ratio: 0,
    fromNode: null, toNode: null, routeKm: progress.clampedVirtualDistanceKm, nearbyDescription: '',
  };
  if (!firstNode || !nodes.length || !geo.segments.length) return fallback;

  if (progress.isCompleted) {
    const lastCoord = geo.allCoords[geo.allCoords.length - 1];
    return {
      position: lastCoord || [firstNode.longitude, firstNode.latitude],
      fromCity: firstNode.city, toCity: '🏁 完成', ratio: 1,
      fromNode: firstNode, toNode: null, routeKm: meta.totalDistanceKm,
      nearbyDescription: '🎉 恭喜完成全程环游中国！',
    };
  }

  const fromNode = nodes.find((node) => node.id === progress.currentNode?.id) ?? firstNode;
  const toNode = progress.nextNode?.id === 'closure-endpoint'
    ? firstNode
    : nodes.find((node) => node.id === progress.nextNode?.id) ?? firstNode;
  const segmentIndex = progress.isOnClosureSegment ? geo.segments.length - 1 : Math.max(0, fromNode.order - 1);
  const segment = geo.segments[segmentIndex];
  const segmentDistance = progress.isOnClosureSegment
    ? closure.distanceKm
    : Math.max(0, (toNode.totalDistanceKm - fromNode.totalDistanceKm));
  const ratio = segmentDistance > 0 ? progress.distanceIntoSegmentKm / segmentDistance : 0;
  const segmentType = segment?.type || 'road';
  const typeLabel: Record<string, string> = {
    road: '高速公路/国道', special_g219: 'G219新藏公路', sea_transfer: '海上轮渡', fallback_linear: '近似路线',
  };
  return {
    position: interpolateOnGeometry(segmentIndex, segment?.distance_km || segmentDistance, ratio),
    fromCity: fromNode.city,
    toCity: toNode.city,
    ratio,
    fromNode,
    toNode,
    routeKm: progress.clampedVirtualDistanceKm,
    nearbyDescription: `${typeLabel[segmentType] || '道路'} · ${fromNode.description}`,
  };
}
