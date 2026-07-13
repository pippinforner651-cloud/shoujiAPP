/**
 * ManualAdapter — 手动录入适配器
 *
 * 状态：✅ 实现完成
 * 用于用户手动填写距离/时长等数据
 */

import type { IActivitySourceAdapter } from './index';
import type { ActivitySource, ExternalActivityInput, UnifiedActivity } from '../../types/activity';
import { simpleHash } from '../../types/activity';

export class ManualAdapter implements IActivitySourceAdapter {
  readonly source: ActivitySource = 'manual';

  async connect(): Promise<boolean> {
    return true;
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async getAuthorizationStatus(): Promise<'authorized' | 'denied' | 'not_determined' | 'unsupported'> {
    return 'authorized';
  }

  async syncActivities(_since?: Date): Promise<ExternalActivityInput[]> {
    // 手动录入由用户主动触发
    return [];
  }

  normalizeActivity(input: ExternalActivityInput): UnifiedActivity {
    return {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: 'local',
      source: 'manual',
      sportType: input.sportType,
      startTime: input.startTime,
      endTime: input.endTime,
      durationSeconds: input.durationSeconds,
      distanceMeters: input.distanceMeters,
      paceSecondsPerKm: input.paceSecondsPerKm || input.durationSeconds / (input.distanceMeters / 1000 || 1),
      calories: input.calories,
      avgHeartRate: input.avgHeartRate,
      maxHeartRate: input.maxHeartRate,
      elevationGain: input.elevationGain,
      routeData: input.routeData,
      deviceName: input.deviceName || '手动录入',
      syncTime: new Date().toISOString(),
      verificationStatus: 'manual_unverified',
      rawDataHash: input.rawDataHash || simpleHash(input),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getLastSyncTime(): Promise<Date | null> {
    return null;
  }
}
