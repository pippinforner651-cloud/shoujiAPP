/**
 * 配速分析
 *
 * 基于 RunRecord 列表计算平均、最快、最慢配速。
 */
import type { RunRecord } from '../../types/run';
import type { PaceAnalysis } from '../../types/analysis';

/** 从记录列表计算配速统计 */
export function analyzePace(records: RunRecord[]): PaceAnalysis {
  if (records.length === 0) {
    return { averagePaceSec: 0, bestPaceSec: 0, worstPaceSec: 0, paceStdDev: 0 };
  }

  const paces = records
    .filter((r) => r.distanceKm > 0 && r.durationMin > 0)
    .map((r) => (r.durationMin * 60) / r.distanceKm); // seconds per km

  if (paces.length === 0) {
    return { averagePaceSec: 0, bestPaceSec: 0, worstPaceSec: 0, paceStdDev: 0 };
  }

  const avg = paces.reduce((s, p) => s + p, 0) / paces.length;
  const best = Math.min(...paces);
  const worst = Math.max(...paces);
  const variance = paces.reduce((s, p) => s + (p - avg) ** 2, 0) / paces.length;
  const stdDev = Math.sqrt(variance);

  return {
    averagePaceSec: Math.round(avg),
    bestPaceSec: Math.round(best),
    worstPaceSec: Math.round(worst),
    paceStdDev: Math.round(stdDev * 100) / 100,
  };
}

/** 将秒配速格式化为 "X'XX"/km" */
export function formatPace(sec: number): string {
  if (sec <= 0) return '--';
  const min = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${min}'${s.toString().padStart(2, '0')}"`;
}

/** 将分钟配速格式化为 "X'XX"/km" */
export function formatPaceMin(min: number): string {
  if (min <= 0) return '--';
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}'${s.toString().padStart(2, '0')}"`;
}
