// 与后端 DTO 对齐的类型定义（backend/src/routes/*）

export interface ApiUser {
  id: string;
  phone: string; // 已脱敏 139****2222
  nickname: string;
  avatarUrl: string | null;
  role: 'member' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}

export interface TrackPointPayload {
  lat: number;
  lon: number;
  accuracyM?: number | null;
  timestamp: string;
}

export interface ActivityPayload {
  clientId: string;
  source: 'gps' | 'manual' | 'watch' | 'joyrun';
  distanceM: number;
  durationSec: number;
  startedAt: string;
  endedAt: string;
  trackPoints?: TrackPointPayload[];
  evidenceNote?: string;
  evidenceImageUrl?: string;
}

export interface ApiActivity {
  id: string;
  clientId: string;
  source: string;
  status: 'pending' | 'valid' | 'rejected';
  distanceM: number;
  durationSec: number;
  avgPaceSec: number;
  startedAt: string;
  endedAt: string;
  rejectReason: string | null;
  createdAt: string;
}

export interface CreateActivityResponse {
  activity: ApiActivity;
  duplicated: boolean;
  verdictReason?: string;
}

export interface MyStats {
  totalM: number;
  totalCount: number;
  totalDurationSec: number;
  avgPaceSec: number;
  todayM: number;
  todayCount: number;
  monthM: number;
  pendingCount: number;
  serverTime: string;
}

export interface ClassProgress {
  routeVersion: { packId: string; version: string; status: string; totalKm: number } | null;
  totalM: number;
  activityCount: number;
  memberCount: number;
  todayCount: number;
  serverTime: string;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  totalM: number;
  activityCount: number;
}

export interface SyncResultItem {
  clientId: string;
  ok: boolean;
  duplicated?: boolean;
  activity?: ApiActivity;
  error?: string;
}

export interface SyncResponse {
  synced: number;
  failed: number;
  results: SyncResultItem[];
}

export interface ProviderStatus {
  provider: string;
  name: string;
  enabled: boolean;      // 后端是否已配置该平台开放平台凭据
  connected: boolean;    // 当前用户是否已授权连接
  lastSyncAt: string | null;
  connectedAt: string | null;
}

/** 平台接入状态目录条目（GET /api/v1/integrations/catalog）——按钮渲染唯一事实源 */
export type IntegrationStage =
  | 'adapter_not_started' | 'adapter_implemented' | 'mock_verified'
  | 'sandbox_connected' | 'production_credentials_ready' | 'production_connected'
  | 'pilot_verified' | 'generally_available'
  | 'requires_wechat_mini_program' | 'requires_native_ios_healthkit';

export interface IntegrationCatalogEntry {
  provider: string;
  display_name: string;
  connection_type: string;
  implementation_status: IntegrationStage;
  credential_status: string;
  sandbox_status: string;
  production_status: string;
  supported_activity_types: string[];
  required_qualifications: string[];
  privacy_requirements: string[];
  commercial_risk: string;
  user_visible_message: string;
  product_facts?: Record<string, string>;
}

export interface ProviderSyncResult {
  provider: string;
  from: string;
  to: string;
  total: number;
  imported: number;
  duplicated: number;
  pending: number;
  rejected: number;
  details: { runId: string; status: string; distanceM: number }[];
}
