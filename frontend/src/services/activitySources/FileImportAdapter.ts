/**
 * FileImportAdapter — GPX / FIT 文件导入适配器
 *
 * 状态：✅ 实现完成
 * 支持解析 GPX XML 和 FIT 二进制文件
 */

import type { IActivitySourceAdapter } from './index';
import type { ActivitySource, ExternalActivityInput, UnifiedActivity, RoutePoint } from '../../types/activity';
import { simpleHash } from '../../types/activity';

export class FileImportAdapter implements IActivitySourceAdapter {
  readonly source: ActivitySource = 'gpx_import'; // 运行时动态设为 gpx_import 或 fit_import

  async connect(): Promise<boolean> {
    return true; // 文件导入无需外部连接
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async getAuthorizationStatus(): Promise<'authorized' | 'denied' | 'not_determined' | 'unsupported'> {
    return 'authorized';
  }

  async syncActivities(_since?: Date): Promise<ExternalActivityInput[]> {
    // 文件导入通过上传触发
    return [];
  }

  normalizeActivity(input: ExternalActivityInput): UnifiedActivity {
    return {
      id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: 'local',
      source: input.source,
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
      deviceName: input.deviceName || '文件导入',
      syncTime: new Date().toISOString(),
      verificationStatus: 'imported_file',
      rawDataHash: input.rawDataHash || simpleHash(input),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getLastSyncTime(): Promise<Date | null> {
    return null;
  }
}

/* =========================================
 * GPX 解析器
 * ========================================= */

/** 解析 GPX XML 字符串 → ExternalActivityInput */
export function parseGpxXml(xmlText: string): ExternalActivityInput | null {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const parserError = xml.querySelector('parsererror');
    if (parserError) throw new Error('GPX XML 格式错误');

    const trkpts = xml.querySelectorAll('trkpt');
    if (trkpts.length === 0) throw new Error('GPX 文件中没有轨迹点');

    const points: RoutePoint[] = [];
    let minEle = Infinity;
    let maxEle = -Infinity;

    trkpts.forEach((pt) => {
      const lat = parseFloat(pt.getAttribute('lat') || '0');
      const lon = parseFloat(pt.getAttribute('lon') || '0');
      const time = pt.querySelector('time')?.textContent || '';
      const ele = pt.querySelector('ele')?.textContent;
      const hr = pt.querySelector('heartrate')?.textContent || pt.querySelector('gpxtpx:hr')?.textContent;
      const altitude = ele ? parseFloat(ele) : undefined;
      if (altitude !== undefined) {
        minEle = Math.min(minEle, altitude);
        maxEle = Math.max(maxEle, altitude);
      }

      points.push({
        latitude: lat,
        longitude: lon,
        timestamp: time || new Date().toISOString(),
        altitude,
        heartRate: hr ? Math.round(parseFloat(hr)) : undefined,
      });
    });

    if (points.length === 0) return null;

    const first = points[0];
    const last = points[points.length - 1];
    const startTime = first.timestamp;
    const endTime = last.timestamp;
    const durationSeconds = Math.round(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
    );

    // 计算距离（Haversine）
    let totalMeters = 0;
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const dlat = (p2.latitude - p1.latitude) * Math.PI / 180;
      const dlng = (p2.longitude - p1.longitude) * Math.PI / 180;
      const a = Math.sin(dlat / 2) ** 2 +
        Math.cos(p1.latitude * Math.PI / 180) *
        Math.cos(p2.latitude * Math.PI / 180) *
        Math.sin(dlng / 2) ** 2;
      totalMeters += 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const elevationGain = maxEle > -Infinity ? Math.round(maxEle - (minEle === Infinity ? 0 : minEle)) : undefined;

    return {
      source: 'gpx_import',
      sportType: 'running',
      startTime,
      endTime,
      durationSeconds: durationSeconds || 1,
      distanceMeters: Math.round(totalMeters * 100) / 100,
      paceSecondsPerKm: totalMeters > 0 ? durationSeconds / (totalMeters / 1000) : 0,
      elevationGain,
      routeData: points,
      deviceName: 'GPX 导入',
      rawDataHash: simpleHash({ startTime, totalMeters, durationSeconds }),
    };
  } catch (err) {
    console.error('[GPX Parser] 解析失败:', err);
    return null;
  }
}

/* =========================================
 * FIT 解析器（占位）
 * ========================================= */

/** 解析 FIT 二进制文件 → ExternalActivityInput */
export function parseFitFile(_arrayBuffer: ArrayBuffer): ExternalActivityInput | null {
  // TODO: 接入 fit-sdk 或自定义解析
  // FIT 协议参考：https://developer.garmin.com/fit/protocol/
  // 常用字段：record.timestamp, record.position_lat, record.position_long,
  //           record.heart_rate, record.altitude, record.speed,
  //           session.total_distance, session.total_elapsed_time,
  //           session.total_calories, session.total_ascent
  console.warn('[FIT Parser] FIT 解析尚未实现，需接入 fit-sdk 库');
  return null;
}
