import assert from 'node:assert/strict';
import test from 'node:test';

const runFlow = await import('../src/utils/runFlow.ts').catch(() => ({}));

test('validates a mobile manual run form with clear limits', () => {
  assert.equal(typeof runFlow.validateManualRun, 'function');
  assert.deepEqual(runFlow.validateManualRun!({ distanceKm: 0, durationMin: 30, date: '2026-07-14' }), { valid: false, error: '跑步距离需在0.1到200公里之间。' });
  assert.deepEqual(runFlow.validateManualRun!({ distanceKm: 5, durationMin: 0, date: '2026-07-14' }), { valid: false, error: '运动时长需在1到1440分钟之间。' });
  assert.equal(runFlow.validateManualRun!({ distanceKm: 5, durationMin: 30, date: '2026-07-14' }).valid, true);
});

test('calculates a stable average pace', () => {
  assert.equal(runFlow.calculatePaceLabel?.(5, 30), `6'00"`);
  assert.equal(runFlow.calculatePaceLabel?.(3, 20), `6'40"`);
});

test('builds a summary from one saved record and route snapshots', () => {
  assert.equal(typeof runFlow.buildRunSummary, 'function');
  const result = runFlow.buildRunSummary!(
    { distanceKm: 5, durationMin: 30 },
    { currentCity: '深圳', nextCity: '厦门', remainingToNextKm: 500, completionRate: 0 },
    { currentCity: '深圳', nextCity: '厦门', remainingToNextKm: 450, completionRate: 0.23 },
  );
  assert.deepEqual(
    [result.virtualDistanceKm, result.paceLabel, result.remainingReducedKm, result.arrivedCity, result.progressGainedPercent],
    [50, `6'00"`, 50, null, 0.23],
  );
});

test('detects arrival when the city changes', () => {
  const result = runFlow.buildRunSummary!(
    { distanceKm: 2, durationMin: 12 },
    { currentCity: '深圳', nextCity: '厦门', remainingToNextKm: 10, completionRate: 2 },
    { currentCity: '厦门', nextCity: '福州', remainingToNextKm: 100, completionRate: 2.1 },
  );
  assert.equal(result.arrivedCity, '厦门');
});
