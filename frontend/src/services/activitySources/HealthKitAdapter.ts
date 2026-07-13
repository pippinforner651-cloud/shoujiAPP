/**
 * HealthKitAdapter — iOS HealthKit 适配器
 *
 * 状态：📋 接口设计完成，等待 iOS 原生 APP
 * PWA 无法读取 HealthKit，所有方法返回 unsupported。
 * 实际调用必须在 iOS 原生层（Swift + HealthKit.framework）实现。
 */

import type { IActivitySourceAdapter } from './index';
import type { ActivitySource, ExternalActivityInput, UnifiedActivity } from '../../types/activity';
import { simpleHash } from '../../types/activity';

export class HealthKitAdapter implements IActivitySourceAdapter {
  readonly source: ActivitySource = 'healthkit';

  async connect(): Promise<boolean> {
    console.warn('[HealthKit] PWA 无法读取 HealthKit，需要 iOS 原生 APP');
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
      id: `hk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: 'local',
      source: 'healthkit',
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
      deviceName: input.deviceName || 'Apple Watch',
      syncTime: new Date().toISOString(),
      verificationStatus: 'verified_platform',
      rawDataHash: input.rawDataHash || simpleHash(input),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getLastSyncTime(): Promise<Date | null> {
    return null;
  }
}

/**
 * HealthKit → UnifiedActivity 字段映射设计
 * （等待 iOS 原生 APP 实现时参考此映射）
 *
 * ┌──────────────────────────┬────────────────────────────┐
 * │ HKHealthStore 接口       │ UnifiedActivity            │
 * ├──────────────────────────┼────────────────────────────┤
 * │ HKWorkout                │ → activity                 │
 * │   workoutActivityType    │ → sportType                │
 * │   startDate              │ → startTime                │
 * │   endDate                │ → endTime                  │
 * │   duration               │ → durationSeconds           │
 * │   totalDistance (m)      │ → distanceMeters            │
 * │   totalEnergyBurned (kcal)│ → calories                 │
 * │ HKQuantitySample         │                            │
 * │   HKHeartRate            │ → avgHeartRate/maxHeartRate │
 * │   HKRoute                │ → routeData                 │
 * │ HKDiscreteSample         │ → elevationGain             │
 * │   HKFlightsClimbed       │                             │
 * │ sourceRevision.source.name│ → deviceName               │
 * └──────────────────────────┴────────────────────────────┘
 */
