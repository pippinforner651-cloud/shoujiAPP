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
  return {
    schemaVersion: V2_ROUTE_SCHEMA_VERSION,
    id: 'e23-china-loop-v2',
    version: '2.0.0-draft.1',
    status: 'DRAFT',
    scope: 'CHINA',
    distancePolicy: V2_DISTANCE_POLICY,
    declaredDistanceMeters: 27_100_000,
    startPlace: campus,
    endPlace: campus,
    nodes: [
      { id: 'campus-start', order: 1, cumulativeDistanceMeters: 0, ...campus },
      { id: 'campus-finish', order: 2, cumulativeDistanceMeters: 27_100_000, ...campus },
    ],
    segments: [{
      id: 'loop',
      order: 1,
      fromNodeId: 'campus-start',
      toNodeId: 'campus-finish',
      distanceMeters: 27_100_000,
      kind: 'ROAD',
      roadNames: ['待路线核验后填写'],
      geometry: { type: 'LineString', coordinates: [[113.973, 22.599], [113.973, 22.599]] },
      sourceRefs: ['route-audit-1'],
    }],
    provenance: { measurementMethod: 'ROAD_ROUTING', sources: ['route-audit-1'], auditedAt: null },
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
  const result = validateRoutePackageV2({ ...createValidRoute(), declaredDistanceMeters: 26_999_999 });
  assert.equal(result.issues.some((issue) => issue.code === 'DISTANCE_BELOW_MINIMUM'), true);
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
  route.segments[0] = { ...route.segments[0], order: 2, distanceMeters: 27_000_000 };
  const result = validateRoutePackageV2(route);
  assert.equal(result.issues.some((issue) => issue.code === 'SEGMENT_SEQUENCE_BROKEN'), true);
  assert.equal(result.issues.some((issue) => issue.code === 'DISTANCE_SUM_MISMATCH'), true);
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
