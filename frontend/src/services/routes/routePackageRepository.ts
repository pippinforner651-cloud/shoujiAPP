import type { RoutePackageV2 } from '../../types/routePackageV2.ts';
import { validateRoutePackageV2 } from '../../utils/routePackageValidator.ts';

export function assertRouteReadyForPublish(route: RoutePackageV2): void {
  const validation = validateRoutePackageV2(route);
  if (!validation.valid) {
    throw new Error(`route validation failed: ${validation.issues.map((issue) => issue.code).join(',')}`);
  }
  if (route.status !== 'VERIFIED' && route.status !== 'PUBLISHED') {
    throw new Error('route is not verified');
  }
}
