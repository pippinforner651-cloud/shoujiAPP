/**
 * V2.0 Phase 6.3 — 统一适配器架构
 *
 * 所有数据源适配器实现统一接口，注册到 SOURCE_ADAPTER_MAP。
 * 业务代码通过 createActivityAdapter(source) 获取适配器实例。
 */

import type {
  ActivitySource,
  ExternalActivityInput,
  AdapterResult,
  UnifiedActivity,
} from '../../types/activity';
import { normalizeActivitySource, simpleHash, toVirtualKm } from '../../types/activity';
import { useRunStore } from '../../store/runStore';
import { AppGpsAdapter } from './AppGpsAdapter';
import { HealthConnectAdapter } from './HealthConnectAdapter';
import { HealthKitAdapter } from './HealthKitAdapter';
import { CorosAdapter } from './CorosAdapter';
import { JoyrunAdapter } from './JoyrunAdapter';
import { FileImportAdapter } from './FileImportAdapter';
import { ManualAdapter } from './ManualAdapter';

/* =========================================
 * 适配器接口 —— 所有适配器必须实现
 * ========================================= */

export interface IActivitySourceAdapter {
  /** 来源标识 */
  readonly source: ActivitySource;

  /** 连接（如需 OAuth / 系统授权） */
  connect(): Promise<boolean>;

  /** 断开连接 */
  disconnect(): Promise<void>;

  /** 获取授权状态 */
  getAuthorizationStatus(): Promise<'authorized' | 'denied' | 'not_determined' | 'unsupported'>;

  /** 同步活动数据 */
  syncActivities(since?: Date): Promise<ExternalActivityInput[]>;

  /** 将外部输入标准化为 UnifiedActivity 兼容格式 */
  normalizeActivity(input: ExternalActivityInput): UnifiedActivity;

  /** 获取上次同步时间 */
  getLastSyncTime(): Promise<Date | null>;
}

/* =========================================
 * 适配器映射表
 * ========================================= */

const adapterMap = new Map<ActivitySource, IActivitySourceAdapter>();

export function registerAdapter(adapter: IActivitySourceAdapter): void {
  adapterMap.set(adapter.source, adapter);
}

export function getAdapter(source: ActivitySource): IActivitySourceAdapter | undefined {
  return adapterMap.get(source);
}

export function getAllAdapters(): IActivitySourceAdapter[] {
  return Array.from(adapterMap.values());
}

/* =========================================
 * 注册所有适配器
 * ========================================= */

registerAdapter(new AppGpsAdapter());
registerAdapter(new HealthConnectAdapter());
registerAdapter(new HealthKitAdapter());
registerAdapter(new CorosAdapter());
registerAdapter(new JoyrunAdapter());
registerAdapter(new FileImportAdapter());
registerAdapter(new ManualAdapter());

/* =========================================
 * 入口函数：将外部输入写入 runStore
 * ========================================= */

export function adaptToRunStore(input: ExternalActivityInput): AdapterResult {
  if (!input.distanceMeters || input.distanceMeters <= 0) {
    return { success: false, error: '距离必须大于 0' };
  }

  const hash = input.rawDataHash || simpleHash(input);

  // 去重检查
  const existing = useRunStore.getState().records;
  const isDuplicate = existing.some((r) => r.rawDataHash === hash);
  if (isDuplicate) {
    return { success: false, error: 'duplicate' };
  }

  const km = input.distanceMeters / 1000;
  const durationMin = input.durationSeconds / 60;

  const record = useRunStore.getState().addRecord(
    input.startTime.slice(0, 10),
    km,
    durationMin,
    `[${input.source}] ${input.deviceName || ''}`.trim(),
    input.routeData?.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      timestamp: p.timestamp,
      altitude: p.altitude,
    })) || undefined,
  );

  // 写入扩展字段
  try {
    const storage = JSON.parse(localStorage.getItem('vr_china_run_v1') || '{}');
    if (storage.records) {
      const idx = storage.records.findIndex((r: { id: string }) => r.id === record.id);
      if (idx >= 0) {
        storage.records[idx].source = input.source;
        storage.records[idx].sportType = input.sportType;
        storage.records[idx].calories = input.calories;
        storage.records[idx].durationSec = input.durationSeconds;
        storage.records[idx].avgHeartRate = input.avgHeartRate;
        storage.records[idx].maxHeartRate = input.maxHeartRate;
        storage.records[idx].elevationGain = input.elevationGain;
        storage.records[idx].deviceName = input.deviceName;
        storage.records[idx].rawDataHash = hash;
        localStorage.setItem('vr_china_run_v1', JSON.stringify(storage));
      }
    }
  } catch { /* eslint-disable-line */ }

  return {
    success: true,
    recordId: record.id,
    virtualKm: toVirtualKm(km),
  };
}

export { AppGpsAdapter, HealthConnectAdapter, HealthKitAdapter, CorosAdapter, JoyrunAdapter, FileImportAdapter, ManualAdapter };

/* =========================================
 * 来源标签辅助函数
 * ========================================= */

import { SOURCE_LABELS, SOURCE_EMOJIS } from '../activityAdapter/types';

export function getSourceLabel(source: string): string {
  const normalized = normalizeActivitySource(source);
  return SOURCE_LABELS[normalized] || source;
}

export function getSourceEmoji(source: string): string {
  const normalized = normalizeActivitySource(source);
  return SOURCE_EMOJIS[normalized] || '📡';
}
