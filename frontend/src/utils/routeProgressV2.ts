import type { RouteNodeV2, RoutePackageV2, RouteSegmentV2 } from '../types/routePackageV2.ts';

export interface RouteProgressV2 {
  acceptedDistanceMeters: number;
  routeDistanceMeters: number;
  overflowDistanceMeters: number;
  progressPercent: number;
  completed: boolean;
  currentNode: RouteNodeV2 | null;
  nextNode: RouteNodeV2 | null;
  currentSegment: RouteSegmentV2 | null;
  distanceIntoSegmentMeters: number;
  distanceToNextNodeMeters: number;
}

function sanitizeDistanceMeters(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function calculateRouteProgressV2(
  acceptedDistanceMeters: number,
  route: RoutePackageV2,
): RouteProgressV2 {
  const accepted = sanitizeDistanceMeters(acceptedDistanceMeters);
  const routeTotal = Math.max(0, Math.round(route.declaredDistanceMeters));
  const routeDistance = Math.min(accepted, routeTotal);
  const completed = routeTotal > 0 && routeDistance >= routeTotal;
  const nodes = [...route.nodes].sort((a, b) => a.order - b.order);
  const segments = [...route.segments].sort((a, b) => a.order - b.order);

  if (nodes.length === 0) {
    return {
      acceptedDistanceMeters: accepted,
      routeDistanceMeters: routeDistance,
      overflowDistanceMeters: Math.max(0, accepted - routeTotal),
      progressPercent: routeTotal === 0 ? 0 : routeDistance / routeTotal * 100,
      completed,
      currentNode: null,
      nextNode: null,
      currentSegment: null,
      distanceIntoSegmentMeters: 0,
      distanceToNextNodeMeters: 0,
    };
  }

  let currentIndex = 0;
  for (let index = 0; index < nodes.length; index += 1) {
    if (nodes[index].cumulativeDistanceMeters <= routeDistance) currentIndex = index;
  }

  const currentNode = nodes[currentIndex];
  const nextNode = completed ? null : nodes[currentIndex + 1] ?? null;
  const currentSegment = completed
    ? segments[segments.length - 1] ?? null
    : segments.find((segment) => segment.fromNodeId === currentNode.id) ?? null;
  const distanceIntoSegmentMeters = completed
    ? currentSegment?.distanceMeters ?? 0
    : Math.max(0, routeDistance - currentNode.cumulativeDistanceMeters);

  return {
    acceptedDistanceMeters: accepted,
    routeDistanceMeters: routeDistance,
    overflowDistanceMeters: Math.max(0, accepted - routeTotal),
    progressPercent: routeTotal === 0 ? 0 : routeDistance / routeTotal * 100,
    completed,
    currentNode,
    nextNode,
    currentSegment,
    distanceIntoSegmentMeters,
    distanceToNextNodeMeters: nextNode
      ? Math.max(0, nextNode.cumulativeDistanceMeters - routeDistance)
      : 0,
  };
}
