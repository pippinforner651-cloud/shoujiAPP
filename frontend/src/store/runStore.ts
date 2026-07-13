/**
 * 跑步数据 Zustand Store
 *
 * V2.1 升级：
 * - 支持 ActivitySource / DeviceInfo / calories / gpsTrack 扩展字段
 * - 新增今日活动查询 + GPS 轨迹统计
 * - 兼容旧版 localStorage 数据（version 1 → 2 → 3 迁移）
 */

import { create } from 'zustand';
import type { RunRecord, RunStats, RunStorage } from '../types/run';
import { STORAGE_KEY, STORAGE_VERSION } from '../types/run';
import type { GpsPoint } from '../types/gps';

/* ===== localStorage 读写 ===== */

function loadFromStorage(): RunStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: STORAGE_VERSION, records: [] };

    const parsed = JSON.parse(raw) as RunStorage;
    if (parsed.version < STORAGE_VERSION) {
      const migrated = parsed.records.map((r) => ({
        ...r,
        source: (r as unknown as Record<string, unknown>).source || 'manual',
      })) as RunRecord[];
      return { version: STORAGE_VERSION, records: migrated };
    }
    return parsed;
  } catch {
    return { version: STORAGE_VERSION, records: [] };
  }
}

function saveToStorage(records: RunRecord[]): void {
  try {
    const data: RunStorage = { version: STORAGE_VERSION, records };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save run data to localStorage:', err);
  }
}

/* ===== 计算统计 ===== */

function computeStats(records: RunRecord[]): RunStats {
  if (records.length === 0) {
    return {
      totalRuns: 0, totalDistanceKm: 0, totalDurationMin: 0,
      averagePace: 0, averageDistanceKm: 0, longestRunKm: 0,
      lastRunDate: null, firstRunDate: null,
    };
  }

  const totalDistance = records.reduce((sum, r) => sum + r.distanceKm, 0);
  const totalDuration = records.reduce((sum, r) => sum + r.durationMin, 0);
  const longestRun = Math.max(...records.map((r) => r.distanceKm));
  const dates = records.map((r) => r.date).sort();

  return {
    totalRuns: records.length,
    totalDistanceKm: Math.round(totalDistance * 100) / 100,
    totalDurationMin: Math.round(totalDuration * 10) / 10,
    averagePace: totalDistance > 0
      ? Math.round((totalDuration / totalDistance) * 100) / 100 : 0,
    averageDistanceKm: Math.round((totalDistance / records.length) * 100) / 100,
    longestRunKm: longestRun,
    lastRunDate: dates[dates.length - 1] ?? null,
    firstRunDate: dates[0] ?? null,
  };
}

export interface TodayActivities {
  count: number;
  totalKm: number;
  totalMin: number;
  avgPace: string;
  totalCal: number;
  sources: string[];
  /** 今日包含 GPS 的记录数 */
  gpsCount: number;
  /** 今日 GPS 总轨迹点数 */
  gpsPoints: number;
  /** 最近一条带 GPS 的记录的轨迹 */
  latestGpsTrack?: GpsPoint[];
}

/* ===== Store ===== */

interface RunState {
  records: RunRecord[];
  stats: RunStats;
  initialized: boolean;

  initialize: () => void;
  addRecord: (date: string, distanceKm: number, durationMin: number, note?: string, gpsTrack?: GpsPoint[], extra?: Partial<RunRecord>) => RunRecord;
  removeRecord: (id: string) => void;
  clearAll: () => void;
  getRecordsByDate: (date: string) => RunRecord[];
  recalcStats: () => void;
  getTodayActivities: () => TodayActivities;
  // Phase 6.3 新增
  getUnsyncedRecords: () => RunRecord[];
  markSynced: (id: string) => void;
  incrementRetry: (id: string) => void;
  getPendingRetryRecords: () => RunRecord[];
}

export const useRunStore = create<RunState>((set, get) => ({
  records: [],
  stats: computeStats([]),
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    const { records } = loadFromStorage();
    const stats = computeStats(records);
    set({ records, stats, initialized: true });
  },

  addRecord: (date, distanceKm, durationMin, note, gpsTrack, extra) => {
    const pace = distanceKm > 0
      ? Math.round((durationMin / distanceKm) * 100) / 100 : 0;

    const record: RunRecord = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date,
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMin: Math.round(durationMin * 10) / 10,
      pace,
      createdAt: new Date().toISOString(),
      note,
      source: 'app_gps',
      sportType: 'running',
      gpsTrack,
      ...(extra || {}),
    };

    const records = [...get().records, record];
    const stats = computeStats(records);
    saveToStorage(records);
    set({ records, stats });
    return record;
  },

  removeRecord: (id) => {
    const records = get().records.filter((r) => r.id !== id);
    const stats = computeStats(records);
    saveToStorage(records);
    set({ records, stats });
  },

  clearAll: () => {
    const records: RunRecord[] = [];
    const stats = computeStats(records);
    saveToStorage(records);
    set({ records, stats });
  },

  getRecordsByDate: (date) => {
    return get().records.filter((r) => r.date === date);
  },

  recalcStats: () => {
    const stats = computeStats(get().records);
    set({ stats });
  },

  getTodayActivities: () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayRecords = get().records.filter((r) => r.date === today);

    const count = todayRecords.length;
    const totalKm = Math.round(todayRecords.reduce((s, r) => s + r.distanceKm, 0) * 100) / 100;
    const totalMin = Math.round(todayRecords.reduce((s, r) => s + r.durationMin, 0) * 10) / 10;
    const totalCal = todayRecords.reduce((s, r) => s + (r.calories || 0), 0);
    const avgPaceSec = totalKm > 0 ? totalMin / totalKm : 0;
    const avgPace = avgPaceSec > 0
      ? `${Math.floor(avgPaceSec)}'${Math.round((avgPaceSec - Math.floor(avgPaceSec)) * 60).toString().padStart(2, '0')}"`
      : '--';
    const sources = [...new Set(todayRecords.map((r) => r.source || 'app_gps'))];

    // GPS 统计
    const gpsRecords = todayRecords.filter((r) => r.gpsTrack && r.gpsTrack.length > 0);
    const gpsCount = gpsRecords.length;
    const gpsPoints = gpsRecords.reduce((s, r) => s + (r.gpsTrack?.length || 0), 0);
    const latestGpsTrack = gpsRecords[gpsRecords.length - 1]?.gpsTrack;

    return { count, totalKm, totalMin, avgPace, totalCal, sources, gpsCount, gpsPoints, latestGpsTrack };
  },

  /* Phase 6.3 — 离线缓存 & 同步重试 */

  getUnsyncedRecords: () => {
    return get().records.filter((r) => r.synced !== true);
  },

  markSynced: (id) => {
    const records = get().records.map((r) =>
      r.id === id ? { ...r, synced: true, retryCount: 0 } : r
    );
    saveToStorage(records);
    set({ records });
  },

  incrementRetry: (id) => {
    const records = get().records.map((r) =>
      r.id === id
        ? { ...r, retryCount: (r.retryCount || 0) + 1, lastSyncAttempt: new Date().toISOString() }
        : r
    );
    saveToStorage(records);
    set({ records });
  },

  getPendingRetryRecords: () => {
    return get().records.filter((r) => r.synced !== true && (r.retryCount || 0) < 5);
  },
}));
