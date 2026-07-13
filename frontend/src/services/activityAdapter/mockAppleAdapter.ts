/**
 * Apple Watch / 华为手表 模拟适配器
 *
 * 模拟从智能手表同步的运动数据。
 * 实际接入时替换为真实蓝牙/云端 API 调用。
 *
 * Phase 6.3 — 输出符合新 ExternalActivityInput 字段。
 */
import type { ExternalActivityInput } from '../../types/activity';

export interface MockWatchInput {
  source: 'healthkit' | 'health_connect';
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
    deviceName: params.deviceName || (params.source === 'healthkit' ? 'Apple Watch Ultra' : 'HUAWEI WATCH GT 4'),
    sportType: 'running',
    distanceMeters: params.distanceKm * 1000,
    durationSeconds: params.durationSec,
    calories: params.calories,
    startTime: now,
  };
}
