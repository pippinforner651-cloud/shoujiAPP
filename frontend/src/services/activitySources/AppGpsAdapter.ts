/**
 * AppGpsAdapter — 本 APP GPS 直录适配器
 *
 * 状态：✅ 已接通
 * 依赖：navigator.geolocation (Web) / @capacitor/geolocation (原生)
 */

import type { IActivitySourceAdapter } from './index';
import type { ActivitySource, ExternalActivityInput, UnifiedActivity, RoutePoint } from '../../types/activity';
import { simpleHash } from '../../types/activity';

export class AppGpsAdapter implements IActivitySourceAdapter {
  readonly source: ActivitySource = 'app_gps';

  async connect(): Promise<boolean> {
    if (!navigator.geolocation) return false;
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return perm.state === 'granted';
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    // GPS 不需要显式断开
  }

  async getAuthorizationStatus(): Promise<'authorized' | 'denied' | 'not_determined' | 'unsupported'> {
    if (!navigator.geolocation) return 'unsupported';
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (perm.state === 'granted') return 'authorized';
      if (perm.state === 'denied') return 'denied';
      return 'not_determined';
    } catch {
      return 'not_determined';
    }
  }

  async syncActivities(_since?: Date): Promise<ExternalActivityInput[]> {
    // GPS 数据是实时采集的，通过 RunSession 直接写入
    return [];
  }

  normalizeActivity(input: ExternalActivityInput): UnifiedActivity {
    return {
      id: `app_gps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: 'local',
      source: 'app_gps',
      sportType: input.sportType,
      startTime: input.startTime,
      endTime: input.endTime,
      durationSeconds: input.durationSeconds,
      distanceMeters: input.distanceMeters,
      paceSecondsPerKm: input.paceSecondsPerKm || input.durationSeconds / (input.distanceMeters / 1000),
      calories: input.calories,
      avgHeartRate: input.avgHeartRate,
      maxHeartRate: input.maxHeartRate,
      elevationGain: input.elevationGain,
      routeData: input.routeData,
      deviceName: input.deviceName || '本机GPS',
      syncTime: new Date().toISOString(),
      verificationStatus: 'verified_device',
      rawDataHash: input.rawDataHash || simpleHash(input),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getLastSyncTime(): Promise<Date | null> {
    return null; // 实时采集
  }
}

/**
 * 将 APPGPS 会话数据转换为 ExternalActivityInput
 */
export function gpsSessionToInput(params: {
  startTime: string;
  endTime: string;
  durationSeconds: number;
  distanceMeters: number;
  points: RoutePoint[];
  calories?: number;
  elevationGain?: number;
}): ExternalActivityInput {
  return {
    source: 'app_gps',
    sportType: 'running',
    startTime: params.startTime,
    endTime: params.endTime,
    durationSeconds: params.durationSeconds,
    distanceMeters: params.distanceMeters,
    paceSecondsPerKm: params.distanceMeters > 0
      ? params.durationSeconds / (params.distanceMeters / 1000)
      : 0,
    calories: params.calories,
    elevationGain: params.elevationGain,
    routeData: params.points,
    deviceName: navigator.platform || '本机',
    rawDataHash: simpleHash({
      startTime: params.startTime,
      distanceMeters: params.distanceMeters,
      durationSeconds: params.durationSeconds,
    }),
  };
}
