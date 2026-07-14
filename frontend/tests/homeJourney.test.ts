import assert from 'node:assert/strict';
import test from 'node:test';

const homeJourney = await import('../src/utils/homeJourney.ts').catch(() => ({}));
const now = new Date('2026-07-14T08:00:00+08:00');

test('creates a focused first-run state instead of a wall of zeroes', () => {
  assert.equal(typeof homeJourney.buildHomeJourney, 'function');
  const result = homeJourney.buildHomeJourney!([], now);
  assert.equal(result.hasRecords, false);
  assert.equal(result.primaryPrompt, '完成第一条跑步记录');
  assert.equal(result.nextMilestone.label, '完成第一次跑步');
});

test('derives today, week and streak from real records', () => {
  const records = [
    { date: '2026-07-14', distanceKm: 2, durationMin: 12 },
    { date: '2026-07-13', distanceKm: 3, durationMin: 19 },
    { date: '2026-07-12', distanceKm: 1, durationMin: 8 },
    { date: '2026-07-05', distanceKm: 9, durationMin: 60 },
  ];
  const result = homeJourney.buildHomeJourney!(records, now);
  assert.deepEqual([result.todayKm, result.weekKm, result.streakDays], [2, 6, 3]);
  assert.equal(result.goalPercent, 67);
  assert.equal(result.nextMilestone.label, '累计21.1公里');
  assert.equal(result.nextMilestone.remainingKm, 6.1);
});

test('marks the gentle daily goal complete without pressure language', () => {
  const result = homeJourney.buildHomeJourney!([{ date: '2026-07-14', distanceKm: 3.2, durationMin: 20 }], now);
  assert.equal(result.goalCompleted, true);
  assert.equal(result.primaryPrompt, '今天已经向前一步');
});
