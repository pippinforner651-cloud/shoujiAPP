import {
  calculateRouteProgress,
  type RouteProgressResult,
  type RouteProgressRoute,
} from './routeProgressCore.ts';

export function calculatePreviewRouteProgressCore(
  actualDistanceKm: number,
  route: RouteProgressRoute,
): RouteProgressResult {
  return calculateRouteProgress(actualDistanceKm, {
    ...route,
    meta: {
      ...route.meta,
      scale_ratio: 1,
    },
  });
}

