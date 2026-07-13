/**
 * 运动数据适配器（V1.1 兼容层）
 *
 * 将外部系统数据转换为统一格式并写入 runStore。
 * V2.1 之后建议使用 services/activityAdapter 新适配器。
 */
import { useRunStore } from '../../store/runStore';
import type { ActivitySource } from '../../types/activity';
import { SCALE_RATIO } from '../../types/progress';

/* ===== 来源名称映射 ===== */
export const SOURCE_LABELS: Record<string, string> = {
  manual: '手动录入',
  apple_health: 'Apple Watch',
  garmin: 'Garmin',
  huawei_health: '华为运动健康',
  xiaomi: '小米运动',
  wechat: '微信运动',
  gps: 'GPS',
  mock: '模拟同步',
};

export const SOURCE_EMOJIS: Record<string, string> = {
  manual: '✏️',
  apple_health: '🍎',
  garmin: '⌚',
  huawei_health: '📱',
  xiaomi: '💪',
  wechat: '💬',
  gps: '📡',
  mock: '🧪',
};

/** 适配结果 */
export interface AdapterResult {
  success: boolean;
  recordId?: string;
  error?: string;
  virtualKm?: number;
}

/** 简易输入（兼容 V1.1 格式） */
export interface SimpleActivityInput {
  source: ActivitySource;
  date: string;
  distanceKm: number;
  durationMin: number;
  calories?: number;
  deviceName?: string;
  note?: string;
}

/** 将简易输入适配到 runStore */
export function adaptActivity(input: SimpleActivityInput): AdapterResult {
  if (!input.distanceKm || input.distanceKm <= 0) {
    return { success: false, error: '距离必须大于 0' };
  }

  const sourceEmoji = SOURCE_EMOJIS[input.source] || '📡';
  const sourceLabel = SOURCE_LABELS[input.source] || input.source;
  const calText = input.calories ? ` [${input.calories}kcal]` : '';
  const deviceText = input.deviceName ? ` [${input.deviceName}]` : '';

  const record = useRunStore.getState().addRecord(
    input.date,
    input.distanceKm,
    input.durationMin,
    `[${sourceEmoji}${sourceLabel}]${calText}${deviceText} ${input.note || ''}`.trim()
  );

  return {
    success: true,
    recordId: record.id,
    virtualKm: Math.round(input.distanceKm * SCALE_RATIO * 100) / 100,
  };
}

/** 批量适配 */
export function adaptActivities(inputs: SimpleActivityInput[]): AdapterResult[] {
  return inputs.map(adaptActivity);
}
