/**
 * 跑步状态机
 *
 * Phase 1.6.1B: 新增新状态 + GPS 参数
 */
export type RunState = 'IDLE' | 'PREPARING' | 'READY' | 'COUNTDOWN' | 'RUNNING' | 'PAUSED' | 'FINISHED';

/** GPS 精度门槛（米）：低于此值视为可以开始 */
export const GPS_ACCURACY_READY_M = 80;

/** GPS 最小有效增量距离（公里）：低于此值不累计 */
export const GPS_MIN_DISTANCE_KM = 0.002;

export interface RunSessionData {
  state: RunState;
  distanceKm: number;
  durationSec: number;
  paceSec: number;     // 当前/平均配速（秒/公里）
  calories: number;
  points: GpsPoint[];
}

export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  altitude?: number;
}

/** 创建空会话 */
export function createEmptySession(): RunSessionData {
  return {
    state: 'IDLE',
    distanceKm: 0,
    durationSec: 0,
    paceSec: 0,
    calories: 0,
    points: [],
  };
}

/** 两点间距离（Haversine） */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 格式化秒为 mm:ss */
export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** 格式化配速 */
export function formatPace(paceSec: number): string {
  if (paceSec <= 0) return '--\'--"';
  const m = Math.floor(paceSec / 60);
  const s = Math.round(paceSec % 60);
  return `${m}'${s.toString().padStart(2, '"')}"`;
}

/** 估算卡路里（粗略：体重 70kg × 距离km × 1.036） */
export function estimateCalories(distanceKm: number): number {
  return Math.round(distanceKm * 70 * 1.036);
}
