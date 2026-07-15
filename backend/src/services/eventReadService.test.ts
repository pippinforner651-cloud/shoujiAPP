import assert from 'node:assert/strict';
import test from 'node:test';

import { createEventReadService, type EventReadRepository } from './eventReadService.js';

const repository: EventReadRepository = {
  async findEvent(eventId) {
    if (eventId !== 'e23-2026') return null;
    return { id: eventId, communityId: 'e23', routePackageId: 'route-v2', targetDistanceMeters: 27_000_000 };
  },
  async listContributionRows() {
    return [
      { userId: 'u1', nickname: '甲', avatarUrl: 'a.png', memberStatus: 'APPROVED', contributionStatus: 'ACCEPTED', acceptedDistanceMeters: 5_000 },
      { userId: 'u2', nickname: '乙', avatarUrl: 'b.png', memberStatus: 'APPROVED', contributionStatus: 'ACCEPTED', acceptedDistanceMeters: 3_200 },
    ];
  },
};

test('returns the locked V2 progress API contract', async () => {
  const service = createEventReadService(repository);
  const result = await service.getProgress('e23-2026');
  assert.equal(result.event_id, 'e23-2026');
  assert.equal(result.route_package_id, 'route-v2');
  assert.equal(result.accepted_distance_meters, 8_200);
  assert.equal(result.route_distance_meters, 8_200);
  assert.equal(result.route_target_meters, 27_000_000);
  assert.equal(result.scale_ratio, 1);
  assert.equal('average_virtual_km' in result, false);
});

test('returns only real approved members in ranking contract', async () => {
  const service = createEventReadService(repository);
  const result = await service.getRanking('e23-2026');
  assert.deepEqual(result.ranking.map((row) => [row.rank, row.user_id, row.accepted_distance_meters]), [
    [1, 'u1', 5_000],
    [2, 'u2', 3_200],
  ]);
});

test('fails closed for an unknown event', async () => {
  const service = createEventReadService(repository);
  await assert.rejects(() => service.getProgress('missing'), /EVENT_NOT_FOUND/);
});
