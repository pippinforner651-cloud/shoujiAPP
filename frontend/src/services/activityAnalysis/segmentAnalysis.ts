/**
 * 公里分段分析
 *
 * 基于 GPS 轨迹点计算每公里耗时和配速。
 */
import type { GpsPoint } from '../../types/gps';
import type { KmSplit } from '../../types/analysis';

/** 两点间距离（Haversine） */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 从 GPS 轨迹计算公里分段 */
export function analyzeSegments(gpsTrack: GpsPoint[]): KmSplit[] {
  if (gpsTrack.length < 2) return [];

  const splits: KmSplit[] = [];
  let cumulativeKm = 0;
  let cumulativeSec = 0;
  let prevKm = 0;
  let prevTime = new Date(gpsTrack[0].timestamp).getTime();

  for (let i = 1; i < gpsTrack.length; i++) {
    const p1 = gpsTrack[i - 1];
    const p2 = gpsTrack[i];
    const dist = haversineKm(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    const timeMs = new Date(p2.timestamp).getTime() - prevTime;

    cumulativeKm += dist;
    cumulativeSec += timeMs / 1000;
    prevTime = new Date(p2.timestamp).getTime();

    // 每完成 1km 记录分段
    if (Math.floor(cumulativeKm) > prevKm) {
      const km = Math.floor(cumulativeKm);
      splits.push({
        km,
        durationSec: Math.round(cumulativeSec),
        paceSec: Math.round(cumulativeSec),
        cumulativeKm: Math.round(cumulativeKm * 100) / 100,
        cumulativeSec: Math.round(cumulativeSec),
      });
      prevKm = km;
      cumulativeSec = 0;
    }
  }

  // 最后一小段（不足1km）
  if (cumulativeSec > 0) {
    splits.push({
      km: splits.length + 1,
      durationSec: Math.round(cumulativeSec),
      paceSec: Math.round(cumulativeSec / (cumulativeKm - (splits.length > 0 ? splits[splits.length - 1].cumulativeKm : 0))),
      cumulativeKm: Math.round((splits[splits.length - 1]?.cumulativeKm || 0) + cumulativeKm * 100) / 100,
      cumulativeSec: Math.round((splits[splits.length - 1]?.cumulativeSec || 0) + cumulativeSec),
    });
  }

  return splits;
}

/** 从分段数据计算最快公里 */
export function findFastestKm(splits: KmSplit): number {
  return splits.paceSec;
}
