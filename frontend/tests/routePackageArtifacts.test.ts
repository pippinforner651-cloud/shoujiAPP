import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

function readJson(relativeUrl: string): Record<string, unknown> {
  return JSON.parse(readFileSync(new URL(relativeUrl, import.meta.url), 'utf8')) as Record<string, unknown>;
}

test('publishes a portable schema with the locked V2 minimum and scale policy', () => {
  const schema = readJson('../../data/route_packages/route-package-v2.schema.json');
  const properties = schema.properties as Record<string, Record<string, unknown>>;
  assert.equal(properties.schemaVersion.const, '2.0');
  assert.equal(properties.distancePolicy.const, 'REAL_1_TO_1');
  assert.equal(properties.declaredDistanceMeters.minimum, 27_000_000);
});

test('defines route nodes as complete standalone schema objects', () => {
  const schema = readJson('../../data/route_packages/route-package-v2.schema.json');
  const definitions = schema.$defs as Record<string, Record<string, unknown>>;
  const node = definitions.node;
  const properties = node.properties as Record<string, unknown>;
  assert.equal(node.type, 'object');
  assert.equal(properties.name !== undefined, true);
  assert.equal(properties.id !== undefined, true);
  assert.equal(node.additionalProperties, false);
});

test('keeps the initial V2 file as an explicitly incomplete draft', () => {
  const draft = readJson('../../data/route_packages/e23-china-loop-v2.draft.json');
  assert.equal(draft.status, 'DRAFT');
  assert.deepEqual(draft.segments, []);
  assert.match(String(draft.auditNote), /not.*official|未.*正式/i);
});

test('the command-line validator fails closed for the incomplete draft', () => {
  const script = new URL('../../data/route_packages/validate-route-package.mjs', import.meta.url);
  const draft = new URL('../../data/route_packages/e23-china-loop-v2.draft.json', import.meta.url);
  const result = spawnSync(process.execPath, [fileURLToPath(script), fileURLToPath(draft)], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(`${result.stdout}${result.stderr}`, /DISTANCE_SUM_MISMATCH|SEGMENT/i);
});
