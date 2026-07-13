/**
 * 模拟 GPS 跑步轨迹数据
 *
 * 生成深圳湾公园 5km 跑步轨迹示例。
 * 起点：深圳湾公园（113.996, 22.515）
 * 终点：深圳湾大桥方向（113.956, 22.506）
 */

import type { GpsPoint } from '../types/gps';

/** 两点之间的线性插值 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 生成深圳 5km 跑步轨迹
 * 约 250 个 GPS 点（每 20m 一个点）
 */
export function generateShenzhenGpsTrack(): GpsPoint[] {
  const points: GpsPoint[] = [];
  const startLat = 22.515;
  const startLng = 113.996;
  const endLat = 22.506;
  const endLng = 113.956;
  const pointCount = 250;

  const startTime = new Date();
  startTime.setHours(7, 30, 0, 0);

  // 每点间隔约 1.2 秒（5km / 250点 ≈ 20m/点，配速 5'/km）
  const intervalMs = 1200;

  for (let i = 0; i < pointCount; i++) {
    const t = i / (pointCount - 1);

    // 沿深圳湾公园海岸线，稍微加入抖动模拟真实轨迹
    const jitterLat = (Math.random() - 0.5) * 0.0003;
    const jitterLng = (Math.random() - 0.5) * 0.0003;

    // 路径不是完全直线：添加弧线偏移
    const arcOffset = Math.sin(t * Math.PI) * 0.002;

    const lat = lerp(startLat, endLat, t) + jitterLat + arcOffset * 0.5;
    const lng = lerp(startLng, endLng, t) + jitterLng - arcOffset;

    const timestamp = new Date(startTime.getTime() + i * intervalMs).toISOString();

    // 海拔在 0-15m 之间波动（深圳湾沿海）
    const altitude = Math.round(5 + Math.sin(i * 0.3) * 5 + Math.random() * 3);

    // 速度在 2.5-4.5 m/s 之间波动
    const speed = Math.round((3 + Math.sin(i * 0.2) * 1 + Math.random() * 0.5) * 10) / 10;

    points.push({
      latitude: Math.round(lat * 100000) / 100000,
      longitude: Math.round(lng * 100000) / 100000,
      timestamp,
      altitude,
      speed,
    });
  }

  return points;
}

/**
 * 生成随机城市跑步轨迹
 * @param centerLng 中心经度
 * @param centerLat 中心纬度
 * @param distanceKm 距离（公里）
 * @param pointCount 坐标点数量
 */
export function generateRandomGpsTrack(
  centerLng: number,
  centerLat: number,
  distanceKm: number,
  pointCount: number = 200
): GpsPoint[] {
  const points: GpsPoint[] = [];
  const startTime = new Date();
  startTime.setHours(18, 0, 0, 0);

  // 总时长 = 距离 * 配速(5min/km)
  const totalSec = distanceKm * 5 * 60;
  const intervalMs = (totalSec / pointCount) * 1000;

  // 半径（度），1度 ≈ 111km
  const radiusDeg = (distanceKm / 2) / 111;

  for (let i = 0; i < pointCount; i++) {
    const t = i / (pointCount - 1);
    const angle = t * Math.PI * 2.5; // 绕中心旋转
    const radius = radiusDeg * (0.3 + 0.7 * Math.sin(t * Math.PI));

    const lat = centerLat + Math.cos(angle) * radius + (Math.random() - 0.5) * 0.0005;
    const lng = centerLng + Math.sin(angle) * radius + (Math.random() - 0.5) * 0.0005;

    points.push({
      latitude: Math.round(lat * 100000) / 100000,
      longitude: Math.round(lng * 100000) / 100000,
      timestamp: new Date(startTime.getTime() + i * intervalMs).toISOString(),
      altitude: Math.round(20 + Math.sin(i * 0.5) * 10 + Math.random() * 5),
      speed: Math.round((3.5 + Math.sin(i * 0.3) * 0.8 + Math.random() * 0.3) * 10) / 10,
    });
  }

  return points;
}
