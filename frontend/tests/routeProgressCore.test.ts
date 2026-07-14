import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateRouteProgress } from '../src/utils/routeProgressCore.ts';

interface RouteFixture {
  meta: { total_distance_km: number; scale_ratio: number; start_city: string; end_city: string };
  nodes: Array<{ id: string; city: string; total_distance_km: number }>;
  closure: { from_city: string; to_city: string; distance_km: number; total_distance_km: number };
}

const route: RouteFixture = {
  meta: { total_distance_km: 21423, scale_ratio: 10, start_city: '深圳', end_city: '深圳' },
  nodes: [
    { id: 'shenzhen', city: '深圳', total_distance_km: 0 },
    { id: 'xiamen', city: '厦门', total_distance_km: 500 },
    { id: 'guangzhou', city: '广州', total_distance_km: 21283 },
  ],
  closure: { from_city: '广州', to_city: '深圳', distance_km: 140, total_distance_km: 21423 },
};

test('applies the frozen 1:10 ratio at the start and first segment', () => {
  const start = calculateRouteProgress(0, route);
  const firstSegment = calculateRouteProgress(25, route);
  assert.deepEqual(
    [start.virtualDistanceKm, start.currentCity, start.nextCity, start.unlockedCityIds],
    [0, '深圳', '厦门', ['shenzhen']],
  );
  assert.deepEqual([firstSegment.virtualDistanceKm, firstSegment.distanceIntoSegmentKm], [250, 250]);
});

test('handles a normal city boundary', () => {
  const result = calculateRouteProgress(50, route);
  assert.deepEqual([result.currentCity, result.nextCity, result.distanceToNextCityKm], ['厦门', '广州', 20783]);
  assert.deepEqual(result.unlockedCityIds, ['shenzhen', 'xiamen']);
});

test('enters the Guangzhou to Shenzhen closure at Guangzhou', () => {
  const result = calculateRouteProgress(2128.3, route);
  assert.deepEqual(
    [result.currentCity, result.nextCity, result.isOnClosureSegment, result.distanceIntoSegmentKm, result.distanceToNextCityKm],
    ['广州', '深圳', true, 0, 140],
  );
});

test('tracks all closure boundaries through Shenzhen completion', () => {
  const plusOne = calculateRouteProgress(2128.4, route);
  const middle = calculateRouteProgress(2135.3, route);
  const beforeEnd = calculateRouteProgress(2142.2, route);
  const finish = calculateRouteProgress(2142.3, route);
  assert.deepEqual([plusOne.isOnClosureSegment, plusOne.distanceIntoSegmentKm], [true, 1]);
  assert.deepEqual([middle.isOnClosureSegment, middle.distanceIntoSegmentKm, middle.distanceToNextCityKm], [true, 70, 70]);
  assert.deepEqual([beforeEnd.currentCity, beforeEnd.nextCity, beforeEnd.distanceToNextCityKm], ['广州', '深圳', 1]);
  assert.deepEqual([finish.currentCity, finish.nextCity, finish.isCompleted, finish.remainingRouteKm], ['深圳', null, true, 0]);
});

test('clamps overrun and invalid negative distances without changing the frozen total', () => {
  const overrun = calculateRouteProgress(3000, route);
  const invalid = calculateRouteProgress(-1, route);
  assert.deepEqual([overrun.clampedVirtualDistanceKm, overrun.totalRouteKm, overrun.progressPercent], [21423, 21423, 100]);
  assert.deepEqual([invalid.actualDistanceKm, invalid.virtualDistanceKm, invalid.currentCity], [0, 0, '深圳']);
});
