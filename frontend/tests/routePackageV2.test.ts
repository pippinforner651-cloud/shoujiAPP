import assert from 'node:assert/strict';
import test from 'node:test';

import {
  V2_DISTANCE_POLICY,
  V2_ROUTE_SCHEMA_VERSION,
  type RoutePackageV2,
} from '../src/types/routePackageV2.ts';
import { validateRoutePackageV2 } from '../src/utils/routePackageValidator.ts';
import { assertRouteReadyForPublish } from '../src/services/routes/routePackageRepository.ts';

function createValidRoute(): RoutePackageV2 {
  const campus = { name: '深圳北大汇丰商学院', latitude: 22.599, longitude: 113.973 };
  const nodes = [
    { id: 'campus', order: 1, cumulativeDistanceMeters: 0, ...campus },
    { id: 'west-1', order: 2, cumulativeDistanceMeters: 0, name: '西向节点一', latitude: 0, longitude: 0 },
    { id: 'west-2', order: 3, cumulativeDistanceMeters: 0, name: '西向节点二', latitude: 0, longitude: -120 },
  ];
  const haversine = (from: [number, number], to: [number, number]) => {
    const radius = 6_371_000;
    const [fromLongitude, fromLatitude] = from;
    const [toLongitude, toLatitude] = to;
    const dLatitude = (toLatitude - fromLatitude) * Math.PI / 180;
    const dLongitude = (toLongitude - fromLongitude) * Math.PI / 180;
    const value = Math.sin(dLatitude / 2) ** 2
      + Math.cos(fromLatitude * Math.PI / 180)
      * Math.cos(toLatitude * Math.PI / 180)
      * Math.sin(dLongitude / 2) ** 2;
    return Math.round(radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
  };
  const geometries: [number, number][][] = [
    [[campus.longitude, campus.latitude], [nodes[1].longitude, nodes[1].latitude]],
    [[nodes[1].longitude, nodes[1].latitude], [nodes[2].longitude, nodes[2].latitude]],
    [[nodes[2].longitude, nodes[2].latitude], [campus.longitude, campus.latitude]],
  ];
  const distances = geometries.map(([from, to]) => haversine(from, to));
  nodes[1].cumulativeDistanceMeters = distances[0];
  nodes[2].cumulativeDistanceMeters = distances[0] + distances[1];

  return {
    schemaVersion: V2_ROUTE_SCHEMA_VERSION,
    id: 'e23-china-loop-v2',
    version: '2.0.0-draft.1',
    status: 'DRAFT',
    scope: 'CHINA',
    distancePolicy: V2_DISTANCE_POLICY,
    declaredDistanceMeters: distances.reduce((sum, distance) => sum + distance, 0),
    startPlace: campus,
    endPlace: campus,
    nodes,
    segments: geometries.map((coordinates, index) => ({
      id: `segment-${index + 1}`,
      order: index + 1,
      fromNodeId: nodes[index].id,
      toNodeId: nodes[(index + 1) % nodes.length].id,
      distanceMeters: distances[index],
      kind: 'ROAD',
      roadNames: ['测试核验道路'],
      geometry: { type: 'LineString', coordinates },
      sourceRefs: ['route-audit-1'],
    })),
    provenance: { measurementMethod: 'ROAD_ROUTING', sources: ['route-audit-1'], auditedAt: '2026-07-15T00:00:00.000Z' },
  };
}

test('defines V2 as a real one-to-one route package contract', () => {
  const route: RoutePackageV2 = {
    schemaVersion: V2_ROUTE_SCHEMA_VERSION,
    id: 'e23-china-loop-v2',
    version: '2.0.0-draft.1',
    status: 'DRAFT',
    scope: 'CHINA',
    distancePolicy: V2_DISTANCE_POLICY,
    declaredDistanceMeters: 27_100_000,
    startPlace: { name: '深圳北大汇丰商学院', latitude: 22.599, longitude: 113.973 },
    endPlace: { name: '深圳北大汇丰商学院', latitude: 22.599, longitude: 113.973 },
    nodes: [],
    segments: [],
    provenance: { measurementMethod: 'ROAD_ROUTING', sources: [], auditedAt: null },
  };

  assert.equal(route.schemaVersion, '2.0');
  assert.equal(route.distancePolicy, 'REAL_1_TO_1');
});

test('accepts a structurally complete 27,000+ kilometre one-to-one loop', () => {
  assert.deepEqual(validateRoutePackageV2(createValidRoute()), { valid: true, issues: [] });
});

test('rejects a V2 route shorter than 27,000 kilometres', () => {
  const route = createValidRoute();
  route.declaredDistanceMeters = 26_999_999;
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((issue) => issue.code === 'DISTANCE_BELOW_MINIMUM'), true);
});

test('rejects missing identity, illegal status and a non-positive declared distance', () => {
  const route = createValidRoute();
  route.id = '';
  route.version = '';
  route.status = 'RELEASED' as RoutePackageV2['status'];
  route.declaredDistanceMeters = 0;
  const codes = validateRoutePackageV2(route).issues.map((item) => item.code);
  assert.equal(codes.includes('MISSING_ROUTE_ID'), true);
  assert.equal(codes.includes('MISSING_ROUTE_VERSION'), true);
  assert.equal(codes.includes('INVALID_ROUTE_STATUS'), true);
  assert.equal(codes.includes('INVALID_DECLARED_DISTANCE'), true);
});

test('rejects a legacy scale policy in V2', () => {
  const result = validateRoutePackageV2({ ...createValidRoute(), distancePolicy: 'LEGACY_SCALED' });
  assert.equal(result.issues.some((issue) => issue.code === 'V2_MUST_BE_ONE_TO_ONE'), true);
});

test('rejects a route that does not close at the campus', () => {
  const result = validateRoutePackageV2({
    ...createValidRoute(),
    endPlace: { name: '广州', latitude: 23.129, longitude: 113.264 },
  });
  assert.equal(result.issues.some((issue) => issue.code === 'NOT_CLOSED_AT_CAMPUS'), true);
});

test('rejects broken segment order and distance totals', () => {
  const route = createValidRoute();
  route.segments[0] = { ...route.segments[0], order: 2, distanceMeters: route.segments[0].distanceMeters - 2_000 };
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((issue) => issue.code === 'SEGMENT_SEQUENCE_BROKEN'), true);
  assert.equal(result.issues.some((issue) => issue.code === 'DISTANCE_SUM_MISMATCH'), true);
});

test('rejects an empty segment geometry even when marked verified', () => {
  const route = createValidRoute();
  route.status = 'VERIFIED';
  route.segments[0].geometry.coordinates = [];
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((item) => item.code === 'GEOMETRY_TOO_SHORT'), true);
});

test('rejects a segment that does not follow the node array order', () => {
  const route = createValidRoute();
  route.segments[0].toNodeId = route.nodes[2].id;
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((item) => item.code === 'SEGMENT_NODE_ORDER_MISMATCH'), true);
});

test('rejects an incorrect node cumulative distance', () => {
  const route = createValidRoute();
  route.nodes[1].cumulativeDistanceMeters += 11;
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((item) => item.code === 'NODE_CUMULATIVE_DISTANCE_MISMATCH'), true);
});

test('rejects a campus start coordinate outside the allowed tolerance', () => {
  const route = createValidRoute();
  route.startPlace = { ...route.startPlace, latitude: 23.129 };
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((item) => item.code === 'START_NOT_AT_CAMPUS'), true);
});

test('rejects a campus end coordinate outside the allowed tolerance', () => {
  const route = createValidRoute();
  route.endPlace = { ...route.endPlace, longitude: 113.264 };
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((item) => item.code === 'END_NOT_AT_CAMPUS'), true);
});

test('rejects a visible break between adjacent segment geometries', () => {
  const route = createValidRoute();
  route.segments[1].geometry.coordinates[0] = [10, 10];
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((item) => item.code === 'ADJACENT_GEOMETRY_DISCONNECTED'), true);
});

test('rejects a route whose segment distance sum differs from the declared total', () => {
  const route = createValidRoute();
  route.declaredDistanceMeters += 11;
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((item) => item.code === 'DISTANCE_SUM_MISMATCH'), true);
});

test('rejects geometry whose calculated distance is seriously inconsistent', () => {
  const route = createValidRoute();
  route.segments[0].distanceMeters = 2_000_000;
  route.declaredDistanceMeters = route.segments.reduce((sum, segment) => sum + segment.distanceMeters, 0);
  route.nodes[1].cumulativeDistanceMeters = route.segments[0].distanceMeters;
  route.nodes[2].cumulativeDistanceMeters = route.segments[0].distanceMeters + route.segments[1].distanceMeters;
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((item) => item.code === 'GEOMETRY_DISTANCE_MISMATCH'), true);
});

test('rejects a route with too few nodes and segments for a real loop', () => {
  const route = createValidRoute();
  route.nodes = route.nodes.slice(0, 2);
  route.segments = route.segments.slice(0, 2);
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((item) => item.code === 'TOO_FEW_NODES'), true);
});

test('rejects mismatched counts and invalid geometry coordinates', () => {
  const route = createValidRoute();
  route.segments.pop();
  route.segments[0].geometry.coordinates[1] = [181, Number.NaN];
  const codes = validateRoutePackageV2(route).issues.map((item) => item.code);
  assert.equal(codes.includes('SEGMENT_NODE_COUNT_MISMATCH'), true);
  assert.equal(codes.includes('INVALID_GEOMETRY_COORDINATE'), true);
});

test('rejects a segment without a declared audit source', () => {
  const route = createValidRoute();
  route.segments[0] = { ...route.segments[0], sourceRefs: ['unknown-source'] };
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((issue) => issue.code === 'MISSING_SOURCE_REFERENCE'), true);
});

test('prevents a draft route from becoming an active event route', () => {
  assert.throws(() => assertRouteReadyForPublish(createValidRoute()), /not verified/i);
});

test('allows a verified route only after all route checks pass', () => {
  const route = { ...createValidRoute(), status: 'VERIFIED' as const };
  assert.doesNotThrow(() => assertRouteReadyForPublish(route));
});
