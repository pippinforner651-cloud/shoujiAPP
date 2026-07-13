/**
 * 路线进度分割工具
 *
 * 基于 route_geometry_v1.json 真实道路坐标，
 * 将路线切分为已完成/未完成段。
 */
import { getRouteData } from '../data/routeLoader';
import { getGeometryData } from '../data/routeGeometryLoader';

export interface RouteSplit {
  /** 已完成路线坐标序列（含跑者位置） */
  completedCoords: [number, number][];
  /** 未完成路线坐标序列（从跑者位置到终点） */
  uncompletedCoords: [number, number][];
  /** 跑者当前位置 */
  runnerCoord: [number, number];
  /** 已完全通过的节点数 */
  completedSegments: number;
  /** 总虚拟里程 */
  totalVirtualKm: number;
}

/**
 * 根据虚拟公里分割路线（基于真实道路几何）
 */
export function splitRouteByProgress(virtualKm: number): RouteSplit {
  const { nodes, meta } = getRouteData();
  const geo = getGeometryData();
  const totalVirtual = meta.totalDistanceKm;

  const defaultRes: RouteSplit = {
    completedCoords: [],
    uncompletedCoords: [...geo.allCoords],
    runnerCoord: [114.07, 22.54],
    completedSegments: 0,
    totalVirtualKm: totalVirtual,
  };

  if (!nodes.length || !geo.segments.length) return defaultRes;

  // 找到跑者所在的城市索引
  let currentIndex = 0;
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].totalDistanceKm <= virtualKm) {
      currentIndex = i;
      break;
    }
  }
  const isAtCity = currentIndex < nodes.length &&
    Math.abs((nodes[currentIndex]?.totalDistanceKm ?? 0) - virtualKm) < 1;

  // ===== 构建已完成路线坐标 =====
  const completedCoords: [number, number][] = [];

  // 前 currentIndex 段完整使用 geometry
  for (let i = 0; i < currentIndex && i < geo.segments.length; i++) {
    const seg = geo.segments[i];
    const coords = seg.geometry.coordinates as [number, number][];
    if (i === 0) {
      completedCoords.push(...coords);
    } else {
      completedCoords.push(...coords.slice(1));
    }
  }

  // 当前段（如果未抵达城市，取部分）
  if (currentIndex < geo.segments.length && !isAtCity && virtualKm > 0 && virtualKm < totalVirtual) {
    const seg = geo.segments[currentIndex];
    const coords = seg.geometry.coordinates as [number, number][];
    const fromNode = nodes[currentIndex];
    const toNode = nodes[Math.min(currentIndex + 1, nodes.length - 1)];
    const segDist = toNode.totalDistanceKm - fromNode.totalDistanceKm;
    const ratio = segDist > 0 ? (virtualKm - fromNode.totalDistanceKm) / segDist : 0;

    // 取一部分坐标
    const totalPoints = coords.length;
    const endPoint = Math.min(Math.ceil(ratio * totalPoints), totalPoints);
    const partial = coords.slice(0, endPoint);

    if (currentIndex === 0) {
      completedCoords.push(...partial);
    } else {
      completedCoords.push(...partial.slice(1));
    }
  }

  // ===== 构建未完成路线坐标 =====
  const uncompletedCoords: [number, number][] = [];

  if (virtualKm <= 0) {
    // 未起步：全部未完成
    uncompletedCoords.push(...geo.allCoords);
  } else if (virtualKm < totalVirtual) {
    // 从当前段的剩余部分开始
    if (currentIndex < geo.segments.length) {
      const seg = geo.segments[currentIndex];
      const segCoords = seg.geometry.coordinates as [number, number][];

      if (!isAtCity) {
        // 取当前段的后半部分
        const fromNode = nodes[currentIndex];
        const toNode = nodes[Math.min(currentIndex + 1, nodes.length - 1)];
        const segDist = toNode.totalDistanceKm - fromNode.totalDistanceKm;
        const ratio = segDist > 0 ? (virtualKm - fromNode.totalDistanceKm) / segDist : 0;
        const totalPoints = segCoords.length;
        const startPoint = Math.min(Math.floor(ratio * totalPoints), totalPoints - 1);
        uncompletedCoords.push(...segCoords.slice(startPoint));
      }

      // 后续段
      for (let i = currentIndex + 1; i < geo.segments.length; i++) {
        const nextSeg = geo.segments[i];
        const nextCoords = nextSeg.geometry.coordinates as [number, number][];
        uncompletedCoords.push(...nextCoords.slice(1));
      }

      // 如果未完成列表为空但还有段，添加当前段的剩余
      if (uncompletedCoords.length === 0 && isAtCity && currentIndex < geo.segments.length) {
        const nextSeg = geo.segments[currentIndex];
        uncompletedCoords.push(...(nextSeg.geometry.coordinates as [number, number][]));
      }
    }
  }
  // virtualKm >= totalVirtual → 已全部完成，未完成列表为空

  // ===== 计算跑者位置 =====
  let runnerCoord: [number, number];
  if (virtualKm <= 0) {
    runnerCoord = [nodes[0].longitude, nodes[0].latitude];
  } else if (virtualKm >= totalVirtual) {
    const last = geo.allCoords[geo.allCoords.length - 1];
    runnerCoord = last || [nodes[nodes.length - 1].longitude, nodes[nodes.length - 1].latitude];
  } else if (isAtCity) {
    // 在某个城市点
    const seg = geo.segments[Math.min(currentIndex, geo.segments.length - 1)];
    const segCoords = seg.geometry.coordinates as [number, number][];
    runnerCoord = segCoords[0] || [nodes[currentIndex].longitude, nodes[currentIndex].latitude];
  } else if (currentIndex < geo.segments.length) {
    // 在两个城市之间：用已完成坐标的最后一个点
    if (completedCoords.length > 0) {
      runnerCoord = completedCoords[completedCoords.length - 1];
    } else {
      const seg = geo.segments[currentIndex];
      const segCoords = seg.geometry.coordinates as [number, number][];
      const fromNode = nodes[currentIndex];
      const toNode = nodes[Math.min(currentIndex + 1, nodes.length - 1)];
      const segDist = toNode.totalDistanceKm - fromNode.totalDistanceKm;
      const ratio = segDist > 0 ? (virtualKm - fromNode.totalDistanceKm) / segDist : 0;
      const pt = Math.min(Math.floor(ratio * segCoords.length), segCoords.length - 1);
      runnerCoord = segCoords[pt];
    }
  } else {
    runnerCoord = [114.07, 22.54];
  }

  return {
    completedCoords,
    uncompletedCoords,
    runnerCoord,
    completedSegments: currentIndex,
    totalVirtualKm: totalVirtual,
  };
}
