/**
 * CorosAdapter — COROS 高驰适配器
 *
 * 状态：⏳ 官方 API 申请中
 *
 * 接入路线：
 * 1. 申请 COROS Official API → coros.com/open
 * 2. 获取 client_id / client_secret
 * 3. OAuth 授权 → 回调 → Token 存储
 * 4. 定时同步 / Webhook 接收
 *
 * 未获官方权限前所有同步方法返回空数据。
 */

import type { IActivitySourceAdapter } from './index';
import type { ActivitySource, ExternalActivityInput, UnifiedActivity } from '../../types/activity';
import { simpleHash } from '../../types/activity';

export class CorosAdapter implements IActivitySourceAdapter {
  readonly source: ActivitySource = 'coros';

  async connect(): Promise<boolean> {
    console.warn('[COROS] 接入申请中，尚未获得官方 API 权限');
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
      id: `coros_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: 'local',
      source: 'coros',
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
      deviceName: input.deviceName || 'COROS',
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

/* =========================================
 * COROS 官方 API 接入准备清单
 * =========================================

材料清单：
□ 企业/开发者注册（coros.com/open）
□ 应用名称、图标、描述
□ OAuth 回调 URL（需部署后端服务器）
□ 需要获取的数据范围（跑步/距离/心率/轨迹）
□ 隐私政策链接
□ 应用使用场景说明

OAuth 授权流程：
1. 用户跳转 COROS 授权页
2. 用户同意 → COROS 回调 redirect_uri?code=xxx
3. 后端用 code 换取 access_token + refresh_token
4. Token 加密存储在 User 表或独立 token 表
5. access_token 过期时用 refresh_token 刷新

回调接口（后端）：
GET /v1/auth/coros/callback?code=xxx&state=yyy

Token 存储：
User 表新增 corosAccessToken / corosRefreshToken / corosTokenExpireAt

数据字段映射：
COROS API              → UnifiedActivity
activity_id            → sourceActivityId
sport_type             → sportType
start_time             → startTime
end_time               → endTime/durationSeconds
total_distance (m)     → distanceMeters
total_calories         → calories
avg_heart_rate         → avgHeartRate
max_heart_rate         → maxHeartRate
total_elevation (m)    → elevationGain
track_points           → routeData
device_model           → deviceName

定时同步：
- 每 30 分钟检查一次
- 使用 COROS Webhook（如有）实时接收

========================================= */
