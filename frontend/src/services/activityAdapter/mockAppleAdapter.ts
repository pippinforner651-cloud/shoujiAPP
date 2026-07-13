/**
 * Apple Watch / 华为手表 模拟适配器
 *
 * 模拟从智能手表同步的运动数据。
 * 实际接入时替换为真实蓝牙/云端 API 调用。
 */
import type { ExternalActivityInput } from '../../types/activity';

export interface MockWatchInput {
  source: 'apple_health' | 'huawei_health';
  distanceKm: number;
  durationSec: number;
  calories?: number;
  deviceName?: string;
}

/** 生成模拟手表输入 */
export function createMockWatchInput(params: MockWatchInput): ExternalActivityInput {
  const now = new Date().toISOString();
  return {
    source: params.source,
    device: {
      name: params.deviceName || (params.source === 'apple_health' ? 'Apple Watch Ultra' : 'HUAWEI WATCH GT 4'),
      model: params.source === 'apple_health' ? 'Ultra 2' : 'GT 4',
    },
    activityType: 'running',
    distanceKm: params.distanceKm,
    durationSec: params.durationSec,
    calories: params.calories,
    startTime: now,
    note: `由 ${params.source === 'apple_health' ? 'Apple Watch' : '华为手表'} 同步`,
  };
}
