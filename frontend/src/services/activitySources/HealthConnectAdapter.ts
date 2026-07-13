/**
 * HealthConnectAdapter — Android Health Connect 适配器
 *
 * 状态：⚠️ PWA 不支持（需要原生 Capacitor 插件）
 * 实际调用：等待 @capacitor/health 或原生插件
 */

import type { IActivitySourceAdapter } from './index';
import type { ActivitySource, ExternalActivityInput, UnifiedActivity } from '../../types/activity';
import { simpleHash } from '../../types/activity';

export class HealthConnectAdapter implements IActivitySourceAdapter {
  readonly source: ActivitySource = 'health_connect';

  async connect(): Promise<boolean> {
    // ❌ PWA 不支持 Health Connect
    console.warn('[HealthConnect] PWA 不支持 Health Connect，需要 Android 原生 APP');
    return false;
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async getAuthorizationStatus(): Promise<'authorized' | 'denied' | 'not_determined' | 'unsupported'> {
    return 'unsupported';
  }

  async syncActivities(_since?: Date): Promise<ExternalActivityInput[]> {
    return [];
  }

  normalizeActivity(input: ExternalActivityInput): UnifiedActivity {
    return {
      id: `hc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: 'local',
      source: 'health_connect',
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
      deviceName: input.deviceName || 'Health Connect',
      syncTime: new Date().toISOString(),
      verificationStatus: 'verified_platform',
      rawDataHash: input.rawDataHash || simpleHash(input),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getLastSyncTime(): Promise<Date | null> {
    const raw = localStorage.getItem('hc_last_sync');
    return raw ? new Date(raw) : null;
  }
}

/**
 * Health Connect 字段映射设计（等待原生 APP）
 *
 * ┌────────────────────┬────────────────────────────┐
 * │ Health Connect     │ UnifiedActivity            │
 * ├────────────────────┼────────────────────────────┤
 * │ ExerciseSession    │ → activity                 │
 * │   ExerciseType     │ → sportType                │
 * │   StartTime        │ → startTime                │
 * │   EndTime          │ → endTime / durationSeconds │
 * │   Distance (m)     │ → distanceMeters           │
 * │   Energy (kcal)    │ → calories                 │
 * │ HeartRateRecord    │ → avgHeartRate / maxHeartRate│
 * │ ElevationGained    │ → elevationGain             │
 * │ Route (lat/lng)    │ → routeData                 │
 * └────────────────────┴────────────────────────────┘
 */
