import assert from 'node:assert/strict';
import test from 'node:test';

const { ALL_ACHIEVEMENTS } = await import('../src/types/achievement.ts');

test('includes the first-run and early-distance milestones', () => {
  const thresholds = ALL_ACHIEVEMENTS
    .filter((item) => item.category === 'distance')
    .map((item) => item.condition.threshold);

  assert.equal([0.1, 5, 10].every((threshold) => thresholds.includes(threshold)), true);
});

test('does not count Shenzhen start as the first destination', () => {
  const firstDestination = ALL_ACHIEVEMENTS.find((item) => item.id === 'city_1');

  assert.equal(firstDestination?.condition.threshold, 2);
  assert.match(firstDestination?.description ?? '', /第一个新城市/);
});

test('uses semantic icon names instead of emoji glyphs', () => {
  assert.equal(ALL_ACHIEVEMENTS.every((item) => /^[a-z-]+$/.test(item.icon)), true);
});
