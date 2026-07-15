import type {
  RoutePackageV2,
  RoutePlace,
  RouteValidationIssue,
  RouteValidationResult,
} from '../types/routePackageV2.ts';

export const V2_MINIMUM_DISTANCE_METERS = 27_000_000;
export const CAMPUS_CLOSURE_TOLERANCE_METERS = 1_000;
export const E23_CAMPUS_NAME = '深圳北大汇丰商学院';

function issue(code: string, path: string, message: string): RouteValidationIssue {
  return { code, path, message };
}

function distanceMeters(a: RoutePlace, b: RoutePlace): number {
  const radius = 6_371_000;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLng = (b.longitude - a.longitude) * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(a.latitude * Math.PI / 180)
    * Math.cos(b.latitude * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function validateSequence(route: RoutePackageV2, issues: RouteValidationIssue[]): void {
  const nodeIds = new Set(route.nodes.map((node) => node.id));
  route.segments.forEach((segment, index) => {
    const previous = route.segments[index - 1];
    const broken = segment.order !== index + 1
      || !nodeIds.has(segment.fromNodeId)
      || !nodeIds.has(segment.toNodeId)
      || Boolean(previous && previous.toNodeId !== segment.fromNodeId);
    if (broken) {
      issues.push(issue('SEGMENT_SEQUENCE_BROKEN', `segments.${index}`, '路段顺序或节点衔接不连续'));
    }
  });
}

function validateSegmentSum(route: RoutePackageV2, issues: RouteValidationIssue[]): void {
  const total = route.segments.reduce((sum, segment) => sum + segment.distanceMeters, 0);
  if (Math.abs(total - route.declaredDistanceMeters) > 1_000) {
    issues.push(issue('DISTANCE_SUM_MISMATCH', 'segments', '路段合计与声明总里程相差超过1公里'));
  }
}

function validateSources(route: RoutePackageV2, issues: RouteValidationIssue[]): void {
  const declaredSources = new Set(route.provenance.sources);
  route.segments.forEach((segment, index) => {
    if (segment.sourceRefs.length === 0 || segment.sourceRefs.some((source) => !declaredSources.has(source))) {
      issues.push(issue('MISSING_SOURCE_REFERENCE', `segments.${index}.sourceRefs`, '路段缺少路线包中已声明的核验来源'));
    }
  });
}

export function validateRoutePackageV2(route: RoutePackageV2): RouteValidationResult {
  const issues: RouteValidationIssue[] = [];

  if (route.declaredDistanceMeters < V2_MINIMUM_DISTANCE_METERS) {
    issues.push(issue('DISTANCE_BELOW_MINIMUM', 'declaredDistanceMeters', 'V2路线不得短于27,000公里'));
  }
  if (route.distancePolicy !== 'REAL_1_TO_1') {
    issues.push(issue('V2_MUST_BE_ONE_TO_ONE', 'distancePolicy', 'V2路线只能使用真实1:1里程'));
  }
  if (
    route.startPlace.name !== E23_CAMPUS_NAME
    || route.endPlace.name !== E23_CAMPUS_NAME
    || distanceMeters(route.startPlace, route.endPlace) > CAMPUS_CLOSURE_TOLERANCE_METERS
  ) {
    issues.push(issue('NOT_CLOSED_AT_CAMPUS', 'endPlace', '起终点必须在深圳北大汇丰商学院1公里范围内闭环'));
  }

  validateSequence(route, issues);
  validateSegmentSum(route, issues);
  validateSources(route, issues);
  return { valid: issues.length === 0, issues };
}
