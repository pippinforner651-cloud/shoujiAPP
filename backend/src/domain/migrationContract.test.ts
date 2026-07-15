import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const reviewSqlUrl = new URL('../../prisma/review-sql/e23_multiplayer_baseline.sql', import.meta.url);
const migrationsUrl = new URL('../../prisma/migrations/', import.meta.url);
const reviewSql = readFileSync(
  reviewSqlUrl,
  'utf8',
);

const listSqlFiles = (directoryUrl: URL): string[] => {
  if (!existsSync(directoryUrl)) return [];

  return readdirSync(directoryUrl, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name);
};

test('keeps unapproved SQL outside Prisma standard migration chain', () => {
  assert.equal(listSqlFiles(migrationsUrl).length, 0);
  assert.match(reviewSql, /DESIGN REVIEW ONLY/);
  assert.match(reviewSql, /NOT APPROVED/);
  assert.match(reviewSql, /NOT PART OF THE PRISMA MIGRATION CHAIN/);
});

test('creates the five additive multiplayer tables', () => {
  for (const table of ['communities', 'community_members', 'route_packages', 'relay_events', 'activity_contributions']) {
    assert.match(reviewSql, new RegExp(`CREATE TABLE "${table}"`));
  }
});

test('adds contribution safety and deduplication constraints', () => {
  assert.match(reviewSql, /CHECK \("accepted_distance_meters" >= 0\)/);
  assert.match(reviewSql, /"activity_contributions_event_id_activity_id_key"/);
  assert.match(reviewSql, /"activities_user_id_source_source_activity_id_key"/);
});

test('contains no destructive data or schema statements', () => {
  assert.doesNotMatch(reviewSql, /^\s*(DROP|DELETE|UPDATE|TRUNCATE)\b/im);
});
