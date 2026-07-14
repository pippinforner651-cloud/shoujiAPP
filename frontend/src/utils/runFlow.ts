export interface ManualRunInput {
  distanceKm: number;
  durationMin: number;
  date: string;
  startTime?: string;
  sportType?: 'running' | 'walking' | 'trail_running';
  note?: string;
}

export interface RouteSnapshot {
  currentCity: string;
  nextCity: string | null;
  remainingToNextKm: number;
  completionRate: number;
}

export interface CompletedRunSummary {
  virtualDistanceKm: number;
  paceLabel: string;
  remainingReducedKm: number;
  arrivedCity: string | null;
  progressGainedPercent: number;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function validateManualRun(input: Pick<ManualRunInput, 'distanceKm' | 'durationMin' | 'date'>) {
  if (!Number.isFinite(input.distanceKm) || input.distanceKm < 0.1 || input.distanceKm > 200) {
    return { valid: false as const, error: '跑步距离需在0.1到200公里之间。' };
  }
  if (!Number.isFinite(input.durationMin) || input.durationMin < 1 || input.durationMin > 1440) {
    return { valid: false as const, error: '运动时长需在1到1440分钟之间。' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { valid: false as const, error: '请选择有效的跑步日期。' };
  }
  return { valid: true as const, error: '' };
}

export function calculatePaceLabel(distanceKm: number, durationMin: number): string {
  if (distanceKm <= 0 || durationMin <= 0) return '--';
  const totalSecondsPerKm = Math.round((durationMin * 60) / distanceKm);
  const minutes = Math.floor(totalSecondsPerKm / 60);
  const seconds = totalSecondsPerKm % 60;
  return `${minutes}'${String(seconds).padStart(2, '0')}"`;
}

export function buildRunSummary(
  run: Pick<ManualRunInput, 'distanceKm' | 'durationMin'>,
  before: RouteSnapshot,
  after: RouteSnapshot,
): CompletedRunSummary {
  return {
    virtualDistanceKm: round(run.distanceKm * 10),
    paceLabel: calculatePaceLabel(run.distanceKm, run.durationMin),
    remainingReducedKm: round(Math.max(0, before.remainingToNextKm - after.remainingToNextKm)),
    arrivedCity: before.currentCity !== after.currentCity ? after.currentCity : null,
    progressGainedPercent: round(Math.max(0, after.completionRate - before.completionRate)),
  };
}
