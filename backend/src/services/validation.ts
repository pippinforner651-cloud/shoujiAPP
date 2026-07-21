// 服务端运动校验引擎：对每条上传活动做规则裁决 valid | pending | rejected
import { RULES } from '../config.js';

export interface TrackPointInput {
  lat: number;
  lon: number;
  accuracyM?: number | null;
  timestamp: string;
}

export interface ActivityInput {
  source: 'gps' | 'manual' | 'watch' | 'joyrun' | 'wechat';
  distanceM: number;
  durationSec: number;
  startedAt: string;
  endedAt: string;
  trackPoints?: TrackPointInput[];
  evidenceNote?: string;
  evidenceImageUrl?: string;
  // 可信来源标记：仅服务端内部置位（如悦跑圈官方 API 服务端对服务端拉取），
  // 客户端提交的任何数据都不得置位。可信数据跳过"无轨迹强制人工审核"。
  trustedSource?: boolean;
}

export type VerdictStatus = 'valid' | 'pending' | 'rejected';
export interface Verdict {
  status: VerdictStatus;
  reason?: string;
  avgPaceSec: number;
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function calcAvgPaceSec(distanceM: number, durationSec: number): number {
  if (distanceM <= 0) return 0;
  return Math.round(durationSec / (distanceM / 1000));
}

/**
 * 裁决顺序：硬性数值 → 时间一致性 → 配速 → 手动凭证/当日上限 → 轨迹质量
 * rejected = 明显造假/不可能数据（不计入、不可恢复）
 * pending  = 可疑但可能真实（人工审核后才计入）
 */
export function validateActivity(input: ActivityInput, manualKmToday: number): Verdict {
  const { distanceM, durationSec } = input;

  if (!Number.isFinite(distanceM) || !Number.isFinite(durationSec)) {
    return { status: 'rejected', reason: '数值非法', avgPaceSec: 0 };
  }
  if (distanceM < RULES.MIN_DISTANCE_M) {
    return { status: 'rejected', reason: `距离小于 ${RULES.MIN_DISTANCE_M} 米`, avgPaceSec: 0 };
  }
  if (distanceM > RULES.MAX_DISTANCE_M) {
    return { status: 'rejected', reason: `距离超过 ${RULES.MAX_DISTANCE_M / 1000} 公里上限`, avgPaceSec: 0 };
  }
  if (durationSec < RULES.MIN_DURATION_SEC) {
    return { status: 'rejected', reason: `时长小于 ${RULES.MIN_DURATION_SEC} 秒`, avgPaceSec: 0 };
  }
  if (durationSec > RULES.MAX_DURATION_SEC) {
    return { status: 'rejected', reason: '时长超过 24 小时', avgPaceSec: 0 };
  }

  const start = new Date(input.startedAt).getTime();
  const end = new Date(input.endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { status: 'rejected', reason: '起止时间非法', avgPaceSec: 0 };
  }
  const declaredDuration = Math.round((end - start) / 1000);
  // 声明时长与起止时间允许 5% 或 120 秒误差（暂停不计入时长的情况）
  const drift = Math.abs(declaredDuration - durationSec);
  if (drift > Math.max(120, declaredDuration * 0.05) && durationSec > declaredDuration) {
    return { status: 'rejected', reason: '运动时长与起止时间不一致', avgPaceSec: 0 };
  }

  const pace = calcAvgPaceSec(distanceM, durationSec);
  if (pace < RULES.MIN_PACE_SEC) {
    return { status: 'rejected', reason: `配速 ${pace}s/km 快于人类极限`, avgPaceSec: pace };
  }
  if (pace > RULES.MAX_PACE_SEC) {
    return { status: 'pending', reason: `配速 ${pace}s/km 异常偏慢，待人工审核`, avgPaceSec: pace };
  }

  if (input.source === 'manual') {
    if (RULES.MANUAL_REQUIRES_EVIDENCE && !input.evidenceNote && !input.evidenceImageUrl) {
      return { status: 'pending', reason: '手动补录缺少凭证说明，待人工审核', avgPaceSec: pace };
    }
    if (manualKmToday + distanceM / 1000 > RULES.MANUAL_MAX_KM_PER_DAY) {
      return { status: 'pending', reason: `当日手动补录累计超过 ${RULES.MANUAL_MAX_KM_PER_DAY}km，待人工审核`, avgPaceSec: pace };
    }
    // 手动记录一律待审核（不信任任何手动来源的自动入账）
    return { status: 'pending', reason: '手动补录待人工审核', avgPaceSec: pace };
  }

  // 外部平台来源（悦跑圈/手表）：无轨迹数据的纯声明一律人工审核，不自动入账；
  // 带轨迹的按下方轨迹质量规则裁决（轨迹可造假但跳变/配速/时间一致性难以同时伪造）
  const pts = input.trackPoints ?? [];
  if ((input.source === 'joyrun' || input.source === 'watch' || input.source === 'wechat') && pts.length < 2 && !input.trustedSource) {
    return { status: 'pending', reason: `${input.source === 'joyrun' ? '悦跑圈' : '手表'}记录缺少轨迹数据，待人工审核`, avgPaceSec: pace };
  }

  // GPS/手表类：轨迹质量检查
  if (pts.length > RULES.MAX_TRACK_POINTS) {
    return { status: 'pending', reason: '轨迹点数量异常，待人工审核', avgPaceSec: pace };
  }
  if (pts.length >= 2) {
    let jumps = 0;
    let badAccuracy = 0;
    let withAccuracy = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.accuracyM != null) {
        withAccuracy++;
        if (p.accuracyM > RULES.MAX_POINT_ACCURACY_M) badAccuracy++;
      }
      if (i > 0) {
        const q = pts[i - 1];
        const d = haversineM(q.lat, q.lon, p.lat, p.lon);
        const dt = Math.max(1, (new Date(p.timestamp).getTime() - new Date(q.timestamp).getTime()) / 1000);
        // 跳变判定：距离超过阈值且换算速度超过 8m/s（约 2:05/km）
        if (d > RULES.MAX_GPS_JUMP_M && d / dt > 8) jumps++;
      }
    }
    if (jumps / (pts.length - 1) > RULES.MAX_GPS_JUMP_RATIO) {
      return { status: 'pending', reason: `轨迹跳变点占比过高（${jumps} 处），待人工审核`, avgPaceSec: pace };
    }
    if (withAccuracy > 0 && badAccuracy / withAccuracy > RULES.MAX_BAD_ACCURACY_RATIO) {
      return { status: 'pending', reason: '轨迹精度整体偏差，待人工审核', avgPaceSec: pace };
    }
  }

  return { status: 'valid', avgPaceSec: pace };
}
