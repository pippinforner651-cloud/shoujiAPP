import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');

test('defines the E23 community, membership, route, event and contribution models', () => {
  for (const model of ['Community', 'CommunityMember', 'RoutePackage', 'RelayEvent', 'ActivityContribution']) {
    assert.match(schema, new RegExp(`model\\s+${model}\\s+\\{`));
  }
});

test('keeps raw activities separate from event contributions', () => {
  assert.match(schema, /contributions\s+ActivityContribution\[\]/);
  assert.match(schema, /@@unique\(\[eventId, activityId\]\)/);
  assert.match(schema, /acceptedDistanceMeters\s+Int/);
});

test('deduplicates source activities per user and source', () => {
  assert.match(schema, /@@unique\(\[userId, source, sourceActivityId\]\)/);
});
