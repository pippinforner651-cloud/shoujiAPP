export interface RouteProgressNode {
  id: string;
  city: string;
  total_distance_km: number;
}

export interface RouteProgressRoute {
  meta: {
    total_distance_km: number;
    scale_ratio: number;
    start_city: string;
    end_city: string;
  };
  nodes: RouteProgressNode[];
  closure: {
    from_city: string;
    to_city: string;
    distance_km: number;
    total_distance_km: number;
  };
}

export interface ClosureEndpoint extends RouteProgressNode {
  isClosureEndpoint: true;
}

export interface RouteProgressResult {
  actualDistanceKm: number;
  virtualDistanceKm: number;
  clampedVirtualDistanceKm: number;
  totalRouteKm: number;
  progressPercent: number;
  currentNode: RouteProgressNode | ClosureEndpoint | null;
  currentCity: string | null;
  nextNode: RouteProgressNode | ClosureEndpoint | null;
  nextCity: string | null;
  distanceIntoSegmentKm: number;
  distanceToNextCityKm: number;
  remainingRouteKm: number;
  isOnClosureSegment: boolean;
  isCompleted: boolean;
  unlockedCityIds: string[];
}

function sanitizeDistance(distanceKm: number): number {
  return Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0;
}

function closureEndpoint(route: RouteProgressRoute): ClosureEndpoint {
  return {
    id: 'closure-endpoint',
    city: route.closure.to_city,
    total_distance_km: route.closure.total_distance_km,
    isClosureEndpoint: true,
  };
}

export function calculateRouteProgress(
  actualDistanceKm: number,
  route: RouteProgressRoute,
): RouteProgressResult {
  const safeActualDistanceKm = sanitizeDistance(actualDistanceKm);
  const virtualDistanceKm = safeActualDistanceKm * route.meta.scale_ratio;
  const totalRouteKm = route.meta.total_distance_km;
  const clampedVirtualDistanceKm = Math.min(virtualDistanceKm, totalRouteKm);
  const finalNode = route.nodes[route.nodes.length - 1] ?? null;
  const endpoint = closureEndpoint(route);
  const isCompleted = clampedVirtualDistanceKm >= totalRouteKm;
  const unlockedCityIds = route.nodes
    .filter((node) => node.total_distance_km <= clampedVirtualDistanceKm)
    .map((node) => node.id);
  const common = {
    actualDistanceKm: safeActualDistanceKm,
    virtualDistanceKm,
    clampedVirtualDistanceKm,
    totalRouteKm,
    progressPercent: totalRouteKm === 0 ? 0 : (clampedVirtualDistanceKm / totalRouteKm) * 100,
    remainingRouteKm: Math.max(0, totalRouteKm - clampedVirtualDistanceKm),
    unlockedCityIds,
  };

  if (!finalNode) {
    return {
      ...common,
      currentNode: null,
      currentCity: null,
      nextNode: null,
      nextCity: null,
      distanceIntoSegmentKm: 0,
      distanceToNextCityKm: 0,
      isOnClosureSegment: false,
      isCompleted,
    };
  }

  if (isCompleted) {
    return {
      ...common,
      currentNode: endpoint,
      currentCity: endpoint.city,
      nextNode: null,
      nextCity: null,
      distanceIntoSegmentKm: route.closure.distance_km,
      distanceToNextCityKm: 0,
      isOnClosureSegment: false,
      isCompleted: true,
    };
  }

  if (clampedVirtualDistanceKm >= finalNode.total_distance_km) {
    return {
      ...common,
      currentNode: finalNode,
      currentCity: finalNode.city,
      nextNode: endpoint,
      nextCity: endpoint.city,
      distanceIntoSegmentKm: clampedVirtualDistanceKm - finalNode.total_distance_km,
      distanceToNextCityKm: totalRouteKm - clampedVirtualDistanceKm,
      isOnClosureSegment: true,
      isCompleted: false,
    };
  }

  const currentIndex = route.nodes.reduce(
    (latestIndex, node, index) => (node.total_distance_km <= clampedVirtualDistanceKm ? index : latestIndex),
    0,
  );
  const currentNode = route.nodes[currentIndex];
  const nextNode = route.nodes[currentIndex + 1] ?? endpoint;
  return {
    ...common,
    currentNode,
    currentCity: currentNode.city,
    nextNode,
    nextCity: nextNode.city,
    distanceIntoSegmentKm: clampedVirtualDistanceKm - currentNode.total_distance_km,
    distanceToNextCityKm: nextNode.total_distance_km - clampedVirtualDistanceKm,
    isOnClosureSegment: false,
    isCompleted: false,
  };
}
