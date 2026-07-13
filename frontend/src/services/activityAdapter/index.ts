/**
 * 活动适配器入口
 *
 * 统一接口：将 ExternalActivityInput 转换为 RunRecord 并写入 runStore。
 * 不同来源的适配器在此注册。
 */
import { useRunStore } from '../../store/runStore';
import type { ExternalActivityInput } from '../../types/activity';
import { SOURCE_LABELS, SOURCE_EMOJIS } from './types';

/** 来源标签 */
export function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] || source;
}

export function getSourceEmoji(source: string): string {
  return SOURCE_EMOJIS[source as keyof typeof SOURCE_EMOJIS] || '📡';
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
  if (!input.distanceKm || input.distanceKm <= 0) {
    return { success: false, error: '距离必须大于 0' };
  }

  // 转换单位
  const durationMin = input.durationSec / 60;
  const date = input.startTime.slice(0, 10);
  const sourceLabel = getSourceLabel(input.source);
  const sourceEmoji = getSourceEmoji(input.source);
  const calText = input.calories ? ` [${input.calories}kcal]` : '';
  const deviceText = input.device?.name ? ` [${input.device.name}]` : '';
  const noteText = input.note ? ` ${input.note}` : '';

  const record = useRunStore.getState().addRecord(
    date,
    input.distanceKm,
    durationMin,
    `[${sourceEmoji}${sourceLabel}]${calText}${deviceText}${noteText}`.trim()
  );

  // 更新扩展字段（通过 localStorage 直接写入）
  try {
    const storage = JSON.parse(localStorage.getItem('vr_china_run_v1') || '{}');
    if (storage.records) {
      const idx = storage.records.findIndex((r: { id: string }) => r.id === record.id);
      if (idx >= 0) {
        storage.records[idx].source = input.source;
        storage.records[idx].device = input.device;
        storage.records[idx].activityType = input.activityType;
        storage.records[idx].calories = input.calories;
        localStorage.setItem('vr_china_run_v1', JSON.stringify(storage));
      }
    }
    // eslint-disable-next-line no-empty
  } catch {}

  return {
    success: true,
    recordId: record.id,
    virtualKm: Math.round(input.distanceKm * 10 * 100) / 100,
  };
}

/** 批量适配 */
export function adaptMultipleToRunStore(inputs: ExternalActivityInput[]): AdaptResult[] {
  return inputs.map(adaptToRunStore);
}
