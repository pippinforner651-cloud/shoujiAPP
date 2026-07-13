/* GPS 轨迹数据模型 */

/** GPS 轨迹点 */
export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  /** 海拔（米，可选） */
  altitude?: number;
  /** 速度（米/秒，可选） */
  speed?: number;
}

/** GPS 轨迹统计 */
export interface GpsTrackStats {
  /** 总距离（公里） */
  totalDistanceKm: number;
  /** 总时长（秒） */
  totalDurationSec: number;
  /** 平均配速（秒/公里） */
  avgPaceSec: number;
  /** 平均速度（公里/小时） */
  avgSpeedKmh: number;
  /** 最大海拔（米） */
  maxAltitude: number;
  /** 最小海拔（米） */
  minAltitude: number;
  /** 起点坐标 */
  startPoint: [number, number];
  /** 终点坐标 */
  endPoint: [number, number];
}

/** 从坐标点列表计算轨迹统计 */
export function computeGpsStats(points: GpsPoint[]): GpsTrackStats | null {
  if (points.length < 2) return null;

  let totalDist = 0;
  let maxAlt = -Infinity;
  let minAlt = Infinity;

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    // Haversine 近似
    const dlat = (p2.latitude - p1.latitude) * Math.PI / 180;
    const dlng = (p2.longitude - p1.longitude) * Math.PI / 180;
    const a = Math.sin(dlat / 2) ** 2 +
      Math.cos(p1.latitude * Math.PI / 180) *
      Math.cos(p2.latitude * Math.PI / 180) *
      Math.sin(dlng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDist += 6371 * c; // 地球半径 6371km

    if (p1.altitude !== undefined) {
      maxAlt = Math.max(maxAlt, p1.altitude);
      minAlt = Math.min(minAlt, p1.altitude);
    }
  }

  const first = points[0];
  const last = points[points.length - 1];
  const totalSec = (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 1000;

  return {
    totalDistanceKm: Math.round(totalDist * 100) / 100,
    totalDurationSec: Math.round(totalSec),
    avgPaceSec: totalDist > 0 ? Math.round(totalSec / totalDist) : 0,
    avgSpeedKmh: totalSec > 0 ? Math.round((totalDist / totalSec) * 3600 * 10) / 10 : 0,
    maxAltitude: maxAlt === -Infinity ? 0 : Math.round(maxAlt),
    minAltitude: minAlt === Infinity ? 0 : Math.round(minAlt),
    startPoint: [first.longitude, first.latitude],
    endPoint: [last.longitude, last.latitude],
  };
}
