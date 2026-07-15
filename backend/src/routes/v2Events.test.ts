import assert from 'node:assert/strict';
import Fastify from 'fastify';
import test from 'node:test';

import { createEventRoutesV2 } from './v2Events.js';

const service = {
  async getProgress(eventId: string) {
    if (eventId === 'missing') throw new Error('EVENT_NOT_FOUND');
    return { event_id: eventId, route_package_id: 'route-v2', route_target_meters: 27_000_000, accepted_distance_meters: 8_200, route_distance_meters: 8_200, overflow_distance_meters: 0, progress_percent: 0.03, participant_count: 2, scale_ratio: 1 as const };
  },
  async getRanking(eventId: string) {
    return { event_id: eventId, ranking: [{ rank: 1, user_id: 'u1', nickname: '甲', avatar_url: 'a.png', accepted_distance_meters: 5_000 }] };
  },
};

test('serves the V2 event progress and ranking contracts', async () => {
  const app = Fastify({ logger: false });
  app.register(createEventRoutesV2(service), { prefix: '/v2/events' });
  const progress = await app.inject({ method: 'GET', url: '/v2/events/e23-2026/progress' });
  const ranking = await app.inject({ method: 'GET', url: '/v2/events/e23-2026/ranking' });
  assert.equal(progress.statusCode, 200);
  assert.equal(progress.json().accepted_distance_meters, 8_200);
  assert.equal(ranking.statusCode, 200);
  assert.equal(ranking.json().ranking[0].user_id, 'u1');
  await app.close();
});

test('returns 404 instead of fabricated data for an unknown event', async () => {
  const app = Fastify({ logger: false });
  app.register(createEventRoutesV2(service), { prefix: '/v2/events' });
  const response = await app.inject({ method: 'GET', url: '/v2/events/missing/progress' });
  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), { error: 'EVENT_NOT_FOUND' });
  await app.close();
});
