import assert from 'node:assert/strict';
import test from 'node:test';

import type { RoutePackageV2 } from '../src/types/routePackageV2.ts';
import { calculateRouteProgressV2 } from '../src/utils/routeProgressV2.ts';

const route: RoutePackageV2 = {
  schemaVersion: '2.0',
  id: 'e23-china-loop-v2',
  version: '2.0.0-test',
  status: 'DRAFT',
  scope: 'CHINA',
  distancePolicy: 'REAL_1_TO_1',
  declaredDistanceMeters: 27_100_000,
  startPlace: { name: '深圳北大汇丰商学院', latitude: 22.599, longitude: 113.973 },
  endPlace: { name: '深圳北大汇丰商学院', latitude: 22.599, longitude: 113.973 },
  nodes: [
    { id: 'campus-start', order: 1, name: '深圳北大汇丰商学院', latitude: 22.599, longitude: 113.973, cumulativeDistanceMeters: 0 },
    { id: 'checkpoint', order: 2, name: '中途节点', latitude: 30, longitude: 110, cumulativeDistanceMeters: 10_000_000 },
    { id: 'campus-finish', order: 3, name: '深圳北大汇丰商学院', latitude: 22.599, longitude: 113.973, cumulativeDistanceMeters: 27_100_000 },
  ],
  segments: [
    { id: 'segment-1', order: 1, fromNodeId: 'campus-start', toNodeId: 'checkpoint', distanceMeters: 10_000_000, kind: 'ROAD', roadNames: [], geometry: { type: 'LineString', coordinates: [] }, sourceRefs: ['source'] },
    { id: 'segment-2', order: 2, fromNodeId: 'checkpoint', toNodeId: 'campus-finish', distanceMeters: 17_100_000, kind: 'ROAD', roadNames: [], geometry: { type: 'LineString', coordinates: [] }, sourceRefs: ['source'] },
  ],
  provenance: { measurementMethod: 'ROAD_ROUTING', sources: ['source'], auditedAt: null },
};

test('uses accepted metres directly without a scale multiplier', () => {
  const progress = calculateRouteProgressV2(8_200, route);
  assert.equal(progress.acceptedDistanceMeters, 8_200);
  assert.equal(progress.routeDistanceMeters, 8_200);
  assert.equal(progress.distanceIntoSegmentMeters, 8_200);
});

test('locates an exact node boundary', () => {
  const progress = calculateRouteProgressV2(10_000_000, route);
  assert.equal(progress.currentNode?.id, 'checkpoint');
  assert.equal(progress.nextNode?.id, 'campus-finish');
  assert.equal(progress.distanceIntoSegmentMeters, 0);
});

test('clamps route position and reports overflow after completion', () => {
  const progress = calculateRouteProgressV2(28_100_000, route);
  assert.equal(progress.routeDistanceMeters, 27_100_000);
  assert.equal(progress.overflowDistanceMeters, 1_000_000);
  assert.equal(progress.progressPercent, 100);
  assert.equal(progress.completed, true);
});

test('sanitizes negative and non-finite contribution totals', () => {
  assert.equal(calculateRouteProgressV2(-1, route).acceptedDistanceMeters, 0);
  assert.equal(calculateRouteProgressV2(Number.NaN, route).acceptedDistanceMeters, 0);
});
