import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../../prisma/migrations/20260715090000_e23_multiplayer_baseline/migration.sql', import.meta.url),
  'utf8',
);

test('creates the five additive multiplayer tables', () => {
  for (const table of ['communities', 'community_members', 'route_packages', 'relay_events', 'activity_contributions']) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
  }
});

test('adds contribution safety and deduplication constraints', () => {
  assert.match(migration, /CHECK \("accepted_distance_meters" >= 0\)/);
  assert.match(migration, /"activity_contributions_event_id_activity_id_key"/);
  assert.match(migration, /"activities_user_id_source_source_activity_id_key"/);
});

test('contains no destructive data or schema statements', () => {
  assert.doesNotMatch(migration, /^\s*(DROP|DELETE|UPDATE|TRUNCATE)\b/im);
});
