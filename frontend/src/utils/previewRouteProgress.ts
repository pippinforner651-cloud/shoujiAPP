import { getRouteData } from '../data/routeLoader.ts';
import {
  type RouteProgressResult,
} from './routeProgressCore.ts';
import { calculatePreviewRouteProgressCore } from './previewRouteProgressCore.ts';

/**
 * V2 preview-only 1:1 projection over the currently visible static route.
 * It does not mutate the frozen V1 route package and is not a publishable V2 route.
 */
export function calculatePreviewRouteProgress(actualDistanceKm: number): RouteProgressResult {
  const { meta, nodes, closure } = getRouteData();
  return calculatePreviewRouteProgressCore(actualDistanceKm, {
    meta: {
      total_distance_km: meta.totalDistanceKm,
      scale_ratio: 1,
      start_city: meta.startCity,
      end_city: meta.endCity,
    },
    nodes: nodes.map((node) => ({
      id: node.id,
      city: node.city,
      total_distance_km: node.totalDistanceKm,
    })),
    closure: {
      from_city: closure.from,
      to_city: closure.to,
      distance_km: closure.distanceKm,
      total_distance_km: closure.totalDistanceKm,
    },
  });
}
