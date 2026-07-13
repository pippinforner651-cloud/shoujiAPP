/**
 * 手动录入适配器
 * 将手动输入转换为统一 ExternalActivityInput
 */
import type { ExternalActivityInput } from '../../types/activity';

export interface ManualInput {
  date: string;
  distanceKm: number;
  durationMin: number;
  note?: string;
}

export function parseManualInput(input: ManualInput): ExternalActivityInput {
  return {
    source: 'manual',
    sportType: 'running',
    distanceMeters: input.distanceKm * 1000,
    durationSeconds: input.durationMin * 60,
    startTime: `${input.date}T00:00:00`,
  };
}
