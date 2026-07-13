/**
 * JoyrunAdapter — 悦跑圈适配器
 *
 * 状态：⏳ 开放平台核验中
 *
 * 悦跑圈开放平台（open.joyrun.com）当前状态：
 * - 请通过 WebFetch 或 WebSearch 核实最新情况
 * - 未获得官方 client_id 前所有方法返回空数据
 * - 禁止使用抓包或非官方接口
 */

import type { IActivitySourceAdapter } from './index';
import type { ActivitySource, ExternalActivityInput, UnifiedActivity } from '../../types/activity';
import { simpleHash } from '../../types/activity';

export class JoyrunAdapter implements IActivitySourceAdapter {
  readonly source: ActivitySource = 'joyrun';

  async connect(): Promise<boolean> {
    console.warn('[悦跑圈] 接入申请中，尚未获得官方 API 权限');
    return false;
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async getAuthorizationStatus(): Promise<'authorized' | 'denied' | 'not_determined' | 'unsupported'> {
    return 'unsupported';
  }

  async syncActivities(_since?: Date): Promise<ExternalActivityInput[]> {
    return [];
  }

  normalizeActivity(input: ExternalActivityInput): UnifiedActivity {
    return {
      id: `joyrun_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: 'local',
      source: 'joyrun',
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
      deviceName: input.deviceName || '悦跑圈',
      syncTime: new Date().toISOString(),
      verificationStatus: 'verified_platform',
      rawDataHash: input.rawDataHash || simpleHash(input),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getLastSyncTime(): Promise<Date | null> {
    return null;
  }
}

/**
 * 悦跑圈开放平台核验记录
 * 核验日期：按实际核验日期填写
 *
 * 检查项：
 * □ 注册入口：open.joyrun.com 是否正常开放
 * □ 新应用申请：是否仍接受新开发者
 * □ 需提交资料：公司/个人认证、应用信息
 * □ OAuth 流程：授权码模式是否正常
 * □ 可读取字段：跑步记录、距离、配速、轨迹
 * □ 历史同步：是否支持按时间范围拉取
 * □ 商业使用限制：有无调用频率限制或费用
 */
