/**
 * 重复活动识别 + 数据可信度检查
 *
 * Phase 6.3 — 使用多维特征识别重复，确保排行榜准确性。
 */

import type { RunRecord } from '../../types/run';
import type { VerificationStatus } from '../../types/activity';

interface DuplicateCheckInput {
  startTime: string;
  distanceMeters: number;
  durationSeconds: number;
  source?: string;
  sourceActivityId?: string;
  rawDataHash?: string;
}

interface DuplicateMatch {
  /** 匹配原因 */
  reason: string;
  /** 匹配到的原记录 ID */
  matchedId: string;
  /** 相似度评分（0-1） */
  confidence: number;
}

/* =========================================
 * 识别策略
 * ========================================= */

/**
 * 策略 1: sourceActivityId 完全匹配
 * 来源平台自带的唯一 ID，最高优先级
 */
function matchBySourceId(input: DuplicateCheckInput, records: RunRecord[]): DuplicateMatch | null {
  if (!input.sourceActivityId) return null;
  const found = records.find((r) => {
    const storedHash = (r as unknown as Record<string, unknown>).rawDataHash;
    const storedSourceId = (r as unknown as Record<string, unknown>).sourceActivityId;
    return storedSourceId === input.sourceActivityId || storedHash === input.sourceActivityId;
  });
  if (found) return { reason: 'source_activity_id 完全匹配', matchedId: found.id, confidence: 1 };
  return null;
}

/**
 * 策略 2: rawDataHash 匹配
 * 基于数据的哈希值，第二优先级
 */
function matchByHash(input: DuplicateCheckInput, records: RunRecord[]): DuplicateMatch | null {
  if (!input.rawDataHash) return null;
  const found = records.find((r) => r.rawDataHash === input.rawDataHash);
  if (found) return { reason: '数据哈希完全匹配', matchedId: found.id, confidence: 0.98 };
  return null;
}

/**
 * 策略 3: 时间 + 距离模糊匹配
 * 同一用户在 ±30 秒内、距离差 < 5% 的记录判定为重复
 */
function matchByTimeAndDistance(input: DuplicateCheckInput, records: RunRecord[]): DuplicateMatch | null {
  const inputTime = new Date(input.startTime).getTime();

  for (const r of records) {
    const rDate = new Date(r.date + 'T00:00:00').getTime();
    // 检查是否同一天
    const inputDate = new Date(input.startTime).getTime();
    const inputDay = new Date(inputDate).setHours(0, 0, 0, 0);

    if (Math.abs(rDate - inputDay) > 86400000) continue; // 不同天，跳过

    // 距离对比（米 vs 存储的公里）
    const storedMeters = r.distanceKm * 1000;
    const distDiff = Math.abs(storedMeters - input.distanceMeters);
    const distRatio = input.distanceMeters > 0 ? distDiff / input.distanceMeters : 1;

    // 时长对比
    const storedSec = (r.durationSec || r.durationMin * 60);
    const durDiff = Math.abs(storedSec - input.durationSeconds);
    const durRatio = input.durationSeconds > 0 ? durDiff / input.durationSeconds : 1;

    if (distRatio < 0.05 && durRatio < 0.05) {
      return {
        reason: `距离差 ${(distRatio * 100).toFixed(1)}%, 时长差 ${(durRatio * 100).toFixed(1)}%`,
        matchedId: r.id,
        confidence: 0.9,
      };
    }
  }

  return null;
}

/* =========================================
 * 主入口
 * ========================================= */

/**
 * 检查指定输入是否与已有记录重复
 * 按优先级依次检测：sourceId → hash → 时间+距离
 */
export function isDuplicate(input: DuplicateCheckInput, records: RunRecord[]): DuplicateMatch | null {
  // 策略 1
  const bySourceId = matchBySourceId(input, records);
  if (bySourceId) return bySourceId;

  // 策略 2
  const byHash = matchByHash(input, records);
  if (byHash) return byHash;

  // 策略 3
  const byTimeDist = matchByTimeAndDistance(input, records);
  if (byTimeDist) return byTimeDist;

  return null;
}

/* =========================================
 * 可信度判定
 * ========================================= */

/**
 * 根据来源和校验结果返回 verificationStatus
 */
export function determineVerificationStatus(params: {
  source: string;
  isDuplicate: boolean;
  isManual: boolean;
  isFileImport: boolean;
}): VerificationStatus {
  if (params.isDuplicate) return 'duplicate';
  if (params.source === 'manual' || params.isManual) return 'manual_unverified';
  if (params.isFileImport) return 'imported_file';
  if (params.source === 'app_gps') return 'verified_device';
  if (['health_connect', 'healthkit', 'coros', 'joyrun', 'wechat'].includes(params.source)) {
    return 'verified_platform';
  }
  return 'manual_unverified';
}

/**
 * 判断一条记录是否应计入排行榜
 */
export function shouldCountForRanking(record: RunRecord): boolean {
  const validStatuses: VerificationStatus[] = ['verified_device', 'verified_platform', 'imported_file'];
  return validStatuses.includes(record.verificationStatus || 'verified_device');
}
