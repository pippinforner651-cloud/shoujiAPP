/**
 * 活动适配器入口（V1.1 兼容层）
 *
 * Phase 6.3 — 适配新的 ExternalActivityInput 字段名。
 */
import { useRunStore } from '../../store/runStore';
import type { ExternalActivityInput } from '../../types/activity';
import { normalizeActivitySource } from '../../types/activity';
import { SOURCE_LABELS, SOURCE_EMOJIS } from './types';

/** 来源标签 */
export function getSourceLabel(source: string): string {
  const normalized = normalizeActivitySource(source);
  return SOURCE_LABELS[normalized] || source;
}

export function getSourceEmoji(source: string): string {
  const normalized = normalizeActivitySource(source);
  return SOURCE_EMOJIS[normalized] || '📡';
}

/** 适配器结果 */
export interface AdaptResult {
  success: boolean;
  recordId?: string;
  error?: string;
  virtualKm?: number;
}

/** 将 ExternalActivityInput 写入 runStore */
export function adaptToRunStore(input: ExternalActivityInput): AdaptResult {
  const km = input.distanceMeters / 1000;
  if (km <= 0) {
    return { success: false, error: '距离必须大于 0' };
  }

  // 转换单位
  const durationMin = input.durationSeconds / 60;
  const date = input.startTime.slice(0, 10);
  const sourceLabel = getSourceLabel(input.source);
  const sourceEmoji = getSourceEmoji(input.source);
  const calText = input.calories ? ` [${input.calories}kcal]` : '';
  const deviceText = input.deviceName ? ` [${input.deviceName}]` : '';

  const record = useRunStore.getState().addRecord(
    date,
    km,
    durationMin,
    `[${sourceEmoji}${sourceLabel}]${calText}${deviceText}`.trim()
  );

  // 更新扩展字段
  try {
    const storage = JSON.parse(localStorage.getItem('vr_china_run_v1') || '{}');
    if (storage.records) {
      const idx = storage.records.findIndex((r: { id: string }) => r.id === record.id);
      if (idx >= 0) {
        storage.records[idx].source = input.source;
        storage.records[idx].sportType = input.sportType;
        storage.records[idx].calories = input.calories;
        storage.records[idx].deviceName = input.deviceName;
        localStorage.setItem('vr_china_run_v1', JSON.stringify(storage));
      }
    }
    // eslint-disable-next-line no-empty
  } catch {}

  return {
    success: true,
    recordId: record.id,
    virtualKm: Math.round(km * 10 * 100) / 100,
  };
}

/** 批量适配 */
export function adaptMultipleToRunStore(inputs: ExternalActivityInput[]): AdaptResult[] {
  return inputs.map(adaptToRunStore);
}
