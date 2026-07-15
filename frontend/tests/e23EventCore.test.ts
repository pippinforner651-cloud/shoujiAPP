import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { mapEventProgressDto, reduceEventLoadFailure } from '../src/services/cloud/eventCore.ts';

test('maps event progress with exact one-to-one metres', () => {
  const progress = mapEventProgressDto({
    event_id: 'e23-2026',
    route_package_id: 'e23-china-loop-v2',
    accepted_distance_meters: 8_200,
    route_distance_meters: 8_200,
    route_target_meters: 27_000_000,
    overflow_distance_meters: 0,
    progress_percent: 8_200 / 27_000_000 * 100,
    participant_count: 2,
    scale_ratio: 1,
  });
  assert.equal(progress.acceptedKm, 8.2);
  assert.equal(progress.routeKm, 8.2);
  assert.equal(progress.scaleRatio, 1);
});

test('reduces a failed cloud load to an honest unavailable state', () => {
  const state = reduceEventLoadFailure('后端暂不可用');
  assert.equal(state.status, 'unavailable');
  assert.equal(state.progress, null);
  assert.deepEqual(state.ranking, []);
});

test('production global progress store has no simulated runner fallback', () => {
  const source = readFileSync(new URL('../src/store/globalProgressStore.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /generateMockRunners|mock\/globalRunners/);
  assert.match(source, /v1-backend/);
  assert.match(source, /v2-backend/);
  assert.match(source, /数据加载失败/);
});
