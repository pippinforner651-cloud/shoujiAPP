import { E23_CAMPUS_REFERENCE, V2_ROUTE_VALIDATION_LIMITS } from '../config/routePackageV2.ts';
import type {
  RoutePackageV2,
  RoutePlace,
  RouteSegmentV2,
  RouteValidationIssue,
  RouteValidationResult,
} from '../types/routePackageV2.ts';

export const V2_MINIMUM_DISTANCE_METERS = V2_ROUTE_VALIDATION_LIMITS.minimumDistanceMeters;
export const CAMPUS_CLOSURE_TOLERANCE_METERS = V2_ROUTE_VALIDATION_LIMITS.campusToleranceMeters;
export const E23_CAMPUS_NAME = E23_CAMPUS_REFERENCE.name;

const VALID_STATUSES = new Set(['DRAFT', 'VERIFIED', 'PUBLISHED', 'ACTIVE', 'ARCHIVED']);
const PUBLICATION_STATUSES = new Set(['VERIFIED', 'PUBLISHED', 'ACTIVE']);

function issue(code: string, path: string, message: string): RouteValidationIssue {
  return { code, path, message };
}

function isFiniteCoordinate(place: RoutePlace | undefined): place is RoutePlace {
  return Boolean(
    place
    && Number.isFinite(place.latitude)
    && Number.isFinite(place.longitude)
    && place.latitude >= -90
    && place.latitude <= 90
    && place.longitude >= -180
    && place.longitude <= 180,
  );
}

export function distanceMeters(a: RoutePlace, b: RoutePlace): number {
  const radius = 6_371_000;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLng = (b.longitude - a.longitude) * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(a.latitude * Math.PI / 180)
    * Math.cos(b.latitude * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function coordinatePlace(coordinate: [number, number]): RoutePlace {
  return { name: '', longitude: coordinate[0], latitude: coordinate[1] };
}

function isValidGeometryCoordinate(coordinate: unknown): coordinate is [number, number] {
  return Array.isArray(coordinate)
    && coordinate.length === 2
    && Number.isFinite(coordinate[0])
    && Number.isFinite(coordinate[1])
    && coordinate[0] >= -180
    && coordinate[0] <= 180
    && coordinate[1] >= -90
    && coordinate[1] <= 90;
}

function geometryDistanceMeters(coordinates: [number, number][]): number {
  return coordinates.slice(1).reduce(
    (total, coordinate, index) => total + distanceMeters(
      coordinatePlace(coordinates[index]),
      coordinatePlace(coordinate),
    ),
    0,
  );
}

function validateIdentityAndStatus(route: RoutePackageV2, issues: RouteValidationIssue[]): void {
  if (typeof route.id !== 'string' || route.id.trim().length === 0) {
    issues.push(issue('MISSING_ROUTE_ID', 'id', '路线包ID不能为空'));
  }
  if (typeof route.version !== 'string' || route.version.trim().length === 0) {
    issues.push(issue('MISSING_ROUTE_VERSION', 'version', '路线包版本不能为空'));
  }
  if (!VALID_STATUSES.has(route.status)) {
    issues.push(issue('INVALID_ROUTE_STATUS', 'status', '路线包状态不合法'));
  }
  if (!Number.isFinite(route.declaredDistanceMeters) || route.declaredDistanceMeters <= 0) {
    issues.push(issue('INVALID_DECLARED_DISTANCE', 'declaredDistanceMeters', '声明总里程必须大于0'));
  }
  if (route.declaredDistanceMeters < V2_MINIMUM_DISTANCE_METERS) {
    issues.push(issue('DISTANCE_BELOW_MINIMUM', 'declaredDistanceMeters', 'V2路线不得短于27,000公里'));
  }
  if (route.distancePolicy !== 'REAL_1_TO_1') {
    issues.push(issue('V2_MUST_BE_ONE_TO_ONE', 'distancePolicy', 'V2路线只能使用真实1:1里程'));
  }
  if (PUBLICATION_STATUSES.has(route.status)) {
    const auditedAt = route.provenance?.auditedAt;
    if (!auditedAt || Number.isNaN(Date.parse(auditedAt))) {
      issues.push(issue('MISSING_ROUTE_AUDIT', 'provenance.auditedAt', '核验、发布或启用路线必须有有效审计时间'));
    }
  }
}

function validateCampus(route: RoutePackageV2, issues: RouteValidationIssue[]): void {
  const startAtCampus = route.startPlace?.name === E23_CAMPUS_REFERENCE.name
    && isFiniteCoordinate(route.startPlace)
    && distanceMeters(route.startPlace, E23_CAMPUS_REFERENCE) <= CAMPUS_CLOSURE_TOLERANCE_METERS;
  if (!startAtCampus) {
    issues.push(issue('START_NOT_AT_CAMPUS', 'startPlace', '起点名称和坐标必须位于深圳北大汇丰商学院允许误差范围内'));
  }

  const endAtCampus = route.endPlace?.name === E23_CAMPUS_REFERENCE.name
    && isFiniteCoordinate(route.endPlace)
    && distanceMeters(route.endPlace, E23_CAMPUS_REFERENCE) <= CAMPUS_CLOSURE_TOLERANCE_METERS;
  if (!endAtCampus) {
    issues.push(issue('END_NOT_AT_CAMPUS', 'endPlace', '终点名称和坐标必须位于深圳北大汇丰商学院允许误差范围内'));
  }
  if (!startAtCampus || !endAtCampus) {
    issues.push(issue('NOT_CLOSED_AT_CAMPUS', 'endPlace', '起终点必须在深圳北大汇丰商学院允许误差范围内闭环'));
  }
}

function validateNodesAndSequence(route: RoutePackageV2, issues: RouteValidationIssue[]): void {
  const nodes = Array.isArray(route.nodes) ? route.nodes : [];
  const segments = Array.isArray(route.segments) ? route.segments : [];

  if (nodes.length < V2_ROUTE_VALIDATION_LIMITS.minimumNodeCount) {
    issues.push(issue('TOO_FEW_NODES', 'nodes', `闭环路线至少需要${V2_ROUTE_VALIDATION_LIMITS.minimumNodeCount}个节点`));
  }
  if (segments.length !== nodes.length) {
    issues.push(issue('SEGMENT_NODE_COUNT_MISMATCH', 'segments', '闭环路线的路段数量必须与节点数量一致'));
  }

  const nodeIds = new Set<string>();
  nodes.forEach((node, index) => {
    if (!node.id || nodeIds.has(node.id)) {
      issues.push(issue('INVALID_OR_DUPLICATE_NODE_ID', `nodes.${index}.id`, '节点ID不能为空或重复'));
    }
    nodeIds.add(node.id);
    if (node.order !== index + 1) {
      issues.push(issue('NODE_ORDER_MISMATCH', `nodes.${index}.order`, '节点顺序必须与数组顺序一致'));
    }
    if (!isFiniteCoordinate(node)) {
      issues.push(issue('INVALID_NODE_COORDINATE', `nodes.${index}`, '节点经纬度必须是合法有限数字'));
    }
  });

  const firstNode = nodes[0];
  if (firstNode && (
    !isFiniteCoordinate(firstNode)
    || distanceMeters(firstNode, E23_CAMPUS_REFERENCE) > V2_ROUTE_VALIDATION_LIMITS.geometryEndpointToleranceMeters
  )) {
    issues.push(issue('FIRST_NODE_NOT_AT_CAMPUS', 'nodes.0', '首节点必须位于深圳北大汇丰商学院'));
  }

  segments.forEach((segment, index) => {
    const expectedFrom = nodes[index];
    const expectedTo = nodes[(index + 1) % nodes.length];
    if (
      segment.order !== index + 1
      || !expectedFrom
      || !expectedTo
      || segment.fromNodeId !== expectedFrom.id
      || segment.toNodeId !== expectedTo.id
    ) {
      issues.push(issue('SEGMENT_NODE_ORDER_MISMATCH', `segments.${index}`, '路段必须按节点数组顺序连接，最后一段必须回到起点'));
      issues.push(issue('SEGMENT_SEQUENCE_BROKEN', `segments.${index}`, '路段顺序或节点衔接不连续'));
    }
  });

  let expectedCumulative = 0;
  nodes.forEach((node, index) => {
    if (
      !Number.isFinite(node.cumulativeDistanceMeters)
      || Math.abs(node.cumulativeDistanceMeters - expectedCumulative)
        > V2_ROUTE_VALIDATION_LIMITS.nodeCumulativeToleranceMeters
    ) {
      issues.push(issue('NODE_CUMULATIVE_DISTANCE_MISMATCH', `nodes.${index}.cumulativeDistanceMeters`, '节点累计里程与前序路段累计不一致，允许误差为0.01公里'));
    }
    if (index < segments.length && Number.isFinite(segments[index].distanceMeters)) {
      expectedCumulative += segments[index].distanceMeters;
    }
  });
}

function validateSegmentGeometry(route: RoutePackageV2, issues: RouteValidationIssue[]): void {
  const nodes = Array.isArray(route.nodes) ? route.nodes : [];
  const segments = Array.isArray(route.segments) ? route.segments : [];
  let previousEnd: [number, number] | undefined;

  segments.forEach((segment: RouteSegmentV2, index) => {
    if (!Number.isFinite(segment.distanceMeters) || segment.distanceMeters <= 0) {
      issues.push(issue('INVALID_SEGMENT_DISTANCE', `segments.${index}.distanceMeters`, '路段声明距离必须大于0'));
    }

    const coordinates = segment.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      issues.push(issue('GEOMETRY_TOO_SHORT', `segments.${index}.geometry.coordinates`, '每条路段geometry至少需要2个坐标点'));
      previousEnd = undefined;
      return;
    }
    if (coordinates.some((coordinate) => !isValidGeometryCoordinate(coordinate))) {
      issues.push(issue('INVALID_GEOMETRY_COORDINATE', `segments.${index}.geometry.coordinates`, 'geometry经纬度必须是合法有限数字'));
      previousEnd = undefined;
      return;
    }

    const validCoordinates = coordinates as [number, number][];
    const geometryStart = validCoordinates[0];
    const geometryEnd = validCoordinates[validCoordinates.length - 1];
    const fromNode = nodes[index];
    const toNode = nodes[(index + 1) % nodes.length];
    if (fromNode && isFiniteCoordinate(fromNode)
      && distanceMeters(coordinatePlace(geometryStart), fromNode) > V2_ROUTE_VALIDATION_LIMITS.geometryEndpointToleranceMeters) {
      issues.push(issue('GEOMETRY_FROM_NODE_MISMATCH', `segments.${index}.geometry.coordinates.0`, 'geometry起点与from节点相距过远'));
    }
    if (toNode && isFiniteCoordinate(toNode)
      && distanceMeters(coordinatePlace(geometryEnd), toNode) > V2_ROUTE_VALIDATION_LIMITS.geometryEndpointToleranceMeters) {
      issues.push(issue('GEOMETRY_TO_NODE_MISMATCH', `segments.${index}.geometry.coordinates`, 'geometry终点与to节点相距过远'));
    }
    if (previousEnd
      && distanceMeters(coordinatePlace(previousEnd), coordinatePlace(geometryStart))
        > V2_ROUTE_VALIDATION_LIMITS.adjacentGeometryToleranceMeters) {
      issues.push(issue('ADJACENT_GEOMETRY_DISCONNECTED', `segments.${index}.geometry.coordinates.0`, '相邻路段geometry首尾存在明显断裂'));
    }

    const calculatedDistance = geometryDistanceMeters(validCoordinates);
    const allowedDifference = Math.max(
      V2_ROUTE_VALIDATION_LIMITS.geometryDistanceAbsoluteToleranceMeters,
      segment.distanceMeters * V2_ROUTE_VALIDATION_LIMITS.geometryDistanceRelativeTolerance,
    );
    if (!Number.isFinite(segment.distanceMeters) || Math.abs(calculatedDistance - segment.distanceMeters) > allowedDifference) {
      issues.push(issue('GEOMETRY_DISTANCE_MISMATCH', `segments.${index}.distanceMeters`, 'geometry计算距离与路段声明距离差异超过1公里或5%阈值'));
    }
    previousEnd = geometryEnd;
  });
}

function validateSegmentSum(route: RoutePackageV2, issues: RouteValidationIssue[]): void {
  const total = (Array.isArray(route.segments) ? route.segments : [])
    .reduce((sum, segment) => sum + (Number.isFinite(segment.distanceMeters) ? segment.distanceMeters : 0), 0);
  if (
    !Number.isFinite(route.declaredDistanceMeters)
    || Math.abs(total - route.declaredDistanceMeters) > V2_ROUTE_VALIDATION_LIMITS.segmentSumToleranceMeters
  ) {
    issues.push(issue('DISTANCE_SUM_MISMATCH', 'segments', '路段合计与声明总里程相差超过0.01公里'));
  }
}

function validateSources(route: RoutePackageV2, issues: RouteValidationIssue[]): void {
  const declaredSources = new Set(Array.isArray(route.provenance?.sources) ? route.provenance.sources : []);
  (Array.isArray(route.segments) ? route.segments : []).forEach((segment, index) => {
    if (!Array.isArray(segment.sourceRefs)
      || segment.sourceRefs.length === 0
      || segment.sourceRefs.some((source) => !declaredSources.has(source))) {
      issues.push(issue('MISSING_SOURCE_REFERENCE', `segments.${index}.sourceRefs`, '路段缺少路线包中已声明的核验来源'));
    }
  });
}

export function validateRoutePackageV2(route: RoutePackageV2): RouteValidationResult {
  const issues: RouteValidationIssue[] = [];
  validateIdentityAndStatus(route, issues);
  validateCampus(route, issues);
  validateNodesAndSequence(route, issues);
  validateSegmentGeometry(route, issues);
  validateSegmentSum(route, issues);
  validateSources(route, issues);
  return { valid: issues.length === 0, issues };
}
