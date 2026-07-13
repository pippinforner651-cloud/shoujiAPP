/**
 * 云活动服务（真实 API）
 *
 * 通过 apiClient 调用后端 /v1/activities 接口。
 */
import { get, post } from './apiClient';
import type { RunRecord } from '../../types/run';

const BASE = '/activities';

/** 上传单条记录 */
export async function uploadActivity(
  record: RunRecord
): Promise<{ success: boolean; id?: string; virtualKm?: number }> {
  const res = await post<{ id: string; virtual_km: number }>(BASE, {
    id: record.id,
    user_id: record.source === 'manual' ? 'guest' : record.source,
    source: record.source || 'manual',
    activity_type: record.activityType || 'running',
    distance_km: record.distanceKm,
    duration_sec: Math.round(record.durationMin * 60),
    pace_sec: record.pace > 0 ? Math.round(record.pace * 60) : undefined,
    calories: record.calories,
    start_time: record.createdAt,
    note: record.note,
  });

  if (res.success && res.data) {
    return { success: true, id: res.data.id, virtualKm: res.data.virtual_km };
  }
  return { success: false };
}

/** 批量上传 */
export async function uploadActivities(
  userId: string,
  records: RunRecord[]
): Promise<{ success: boolean; uploaded: number; totalVirtualKm: number }> {
  if (!records.length) return { success: true, uploaded: 0, totalVirtualKm: 0 };

  const res = await post<{ uploaded: number; duplicates: number; total_virtual_km: number }>(
    `${BASE}/batch`,
    {
      user_id: userId,
      activities: records.map((r) => ({
        id: r.id,
        source: r.source || 'manual',
        activity_type: r.activityType || 'running',
        distance_km: r.distanceKm,
        duration_sec: Math.round(r.durationMin * 60),
        pace_sec: r.pace > 0 ? Math.round(r.pace * 60) : undefined,
        calories: r.calories,
        start_time: r.createdAt,
        note: r.note,
      })),
    }
  );

  if (res.success && res.data) {
    return { success: true, uploaded: res.data.uploaded, totalVirtualKm: res.data.total_virtual_km };
  }
  return { success: false, uploaded: 0, totalVirtualKm: 0 };
}

/** 从云端下载记录 */
export async function downloadActivities(
  userId: string,
  sinceDate?: string
): Promise<RunRecord[]> {
  let path = `${BASE}/user/${userId}?limit=200`;
  if (sinceDate) path += `&since=${sinceDate}`;

  const res = await get<{ activities: RunRecord[] }>(path);
  if (res.success && res.data) return res.data.activities;
  return [];
}

/** 合并云端和本地记录（云端优先） */
export function mergeActivities(local: RunRecord[], cloud: RunRecord[]): RunRecord[] {
  const map = new Map<string, RunRecord>();
  for (const r of local) map.set(r.id, r);
  for (const r of cloud) map.set(r.id, r);
  return Array.from(map.values()).sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
  );
}

/** 同步时间管理 */
let _lastSyncTime = '';
export function getLastSyncTime(): string { return _lastSyncTime; }
export function setLastSyncTime(time: string): void { _lastSyncTime = time; }
