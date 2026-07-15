import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEventProgress, buildEventRanking } from './eventProgress.js';

const rows = [
  { userId: 'u1', nickname: '甲', avatarUrl: 'a.png', memberStatus: 'APPROVED', contributionStatus: 'ACCEPTED', acceptedDistanceMeters: 5_000 },
  { userId: 'u2', nickname: '乙', avatarUrl: 'b.png', memberStatus: 'APPROVED', contributionStatus: 'ACCEPTED', acceptedDistanceMeters: 3_200 },
  { userId: 'u1', nickname: '甲', avatarUrl: 'a.png', memberStatus: 'APPROVED', contributionStatus: 'PENDING', acceptedDistanceMeters: 8_000 },
  { userId: 'u3', nickname: '丙', avatarUrl: 'c.png', memberStatus: 'PENDING', contributionStatus: 'ACCEPTED', acceptedDistanceMeters: 10_000 },
] as const;

test('builds exact one-to-one class progress from approved accepted rows only', () => {
  const progress = buildEventProgress(27_000_000, rows);
  assert.equal(progress.acceptedDistanceMeters, 8_200);
  assert.equal(progress.routeDistanceMeters, 8_200);
  assert.equal(progress.scaleRatio, 1);
  assert.equal(progress.participantCount, 2);
});

test('builds a real member ranking without pending rows', () => {
  const ranking = buildEventRanking(rows);
  assert.deepEqual(ranking.map((row) => [row.rank, row.userId, row.acceptedDistanceMeters]), [
    [1, 'u1', 5_000],
    [2, 'u2', 3_200],
  ]);
});

test('clamps route position and preserves over-target contribution', () => {
  const progress = buildEventProgress(8_000, rows);
  assert.equal(progress.routeDistanceMeters, 8_000);
  assert.equal(progress.overflowDistanceMeters, 200);
  assert.equal(progress.progressPercent, 100);
});
