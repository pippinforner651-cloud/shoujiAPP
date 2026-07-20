import assert from 'node:assert/strict';
import test from 'node:test';

import { loadGlobalProgress, type GlobalProgressLoaders } from '../src/store/globalProgressStore.ts';

function createLoaders(): GlobalProgressLoaders {
  return {
    async loadV1Leaderboard() {
      return {
        leaderboard: [
          { rank: 1, user_id: 'u1', nickname: '甲', avatar: 'a.png', total_distance_km: 500, run_count: 10 },
          { rank: 2, user_id: 'u2', nickname: '乙', avatar: 'b.png', total_distance_km: 320, run_count: 8 },
        ],
        total_participants: 2,
        global_total_km: 820,
      };
    },
    async locateV1Average(actualDistanceKm) {
      return {
        virtualDistanceKm: actualDistanceKm * 10,
        currentCity: '天津',
        currentCityIndex: 9,
        progressPercent: actualDistanceKm * 10 / 21_423 * 100,
      };
    },
    async loadV2Progress() {
      throw new Error('V2 loader should not be called');
    },
    async loadV2Ranking() {
      throw new Error('V2 loader should not be called');
    },
  };
}

test('loads the existing real V1 backend and keeps its frozen 1:10 calculation', async () => {
  const result = await loadGlobalProgress({ mode: 'v1-backend', loaders: createLoaders() });
  assert.equal(result.status, 'ready');
  assert.equal(result.progress.participantCount, 2);
  assert.equal(result.progress.totalRealKm, 820);
  assert.equal(result.progress.totalVirtualKm, 8_200);
  assert.equal(result.progress.averageVirtualKm, 4_100);
  assert.deepEqual(result.progress.allRunners.map((runner) => runner.id), ['u1', 'u2']);
});

test('reports a real V1 backend failure instead of fabricating zero progress', async () => {
  const loaders = createLoaders();
  loaders.loadV1Leaderboard = async () => { throw new Error('network down'); };
  const result = await loadGlobalProgress({ mode: 'v1-backend', loaders });
  assert.equal(result.status, 'error');
  assert.match(result.error ?? '', /数据加载失败/);
  assert.equal(result.progress.allRunners.length, 0);
});

test('keeps V2 disabled until an event ID is explicitly configured', async () => {
  const result = await loadGlobalProgress({ mode: 'v2-backend', eventId: '', loaders: createLoaders() });
  assert.equal(result.status, 'disabled');
  assert.equal(result.error, '多人服务暂未启用');
});

test('disabled mode never calls a backend and never creates a fake ranking', async () => {
  let calls = 0;
  const loaders = createLoaders();
  loaders.loadV1Leaderboard = async () => { calls += 1; throw new Error('unexpected'); };
  const result = await loadGlobalProgress({ mode: 'disabled', loaders });
  assert.equal(calls, 0);
  assert.equal(result.status, 'disabled');
  assert.deepEqual(result.progress.allRunners, []);
});
