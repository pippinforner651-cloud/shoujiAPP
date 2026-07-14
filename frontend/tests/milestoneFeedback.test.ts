import assert from 'node:assert/strict';
import test from 'node:test';

const milestones = await import('../src/utils/milestoneFeedback.ts').catch(() => ({}));

test('defines first run, five kilometre and first destination milestones', () => {
  assert.equal(typeof milestones.getCoreMilestoneDefinitions, 'function');
  const definitions = milestones.getCoreMilestoneDefinitions!();
  assert.equal(definitions.find((item: { id: string }) => item.id === 'dist_first')?.threshold, 0.1);
  assert.equal(definitions.find((item: { id: string }) => item.id === 'dist_5')?.threshold, 5);
  assert.equal(definitions.find((item: { id: string }) => item.id === 'city_first')?.threshold, 2);
});

test('returns only milestones crossed by this save', () => {
  assert.equal(typeof milestones.findNewMilestones, 'function');
  const result = milestones.findNewMilestones!(
    { totalKm: 4.9, streakDays: 1, unlockedCityCount: 1 },
    { totalKm: 5.2, streakDays: 1, unlockedCityCount: 1 },
  );
  assert.deepEqual(result.map((item: { id: string }) => item.id), ['dist_5']);
});

test('does not repeat a milestone already reached before the run', () => {
  const result = milestones.findNewMilestones!(
    { totalKm: 10, streakDays: 3, unlockedCityCount: 2 },
    { totalKm: 12, streakDays: 4, unlockedCityCount: 2 },
  );
  assert.deepEqual(result, []);
});

test('filters milestones already acknowledged on this device', () => {
  assert.equal(typeof milestones.filterUnseenMilestones, 'function');
  const definitions = milestones.getCoreMilestoneDefinitions!();
  assert.deepEqual(
    milestones.filterUnseenMilestones!(definitions.slice(0, 2), ['dist_first']).map((item: { id: string }) => item.id),
    ['dist_5'],
  );
});
