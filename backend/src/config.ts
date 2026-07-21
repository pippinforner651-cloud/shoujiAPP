// 服务端配置与运动校验规则（全部可环境变量覆盖）
export const CONFIG = {
  PORT: Number(process.env.PORT ?? 8787),
  HOST: process.env.HOST ?? '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? 'e23-dev-secret-change-me',
  JWT_EXPIRES: process.env.JWT_EXPIRES ?? '30d',
  // CORS 白名单：逗号分隔来源；'*' 仅开发态，生产必须显式配置
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
  // 限流：每 IP 每分钟最大请求数（生产建议收紧）
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 300),
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW ?? '1 minute',
  // 班级汇总进度在 route_progress.userId 上的哨兵值
  // （PostgreSQL 唯一索引中 NULL 不互斥，无法用 NULL 表示"全班"，故用哨兵字符串）
  CLASS_SENTINEL: 'CLASS',
  // 前端地址（OAuth 回调完成后跳转回前端用；惰性读取便于测试注入）
  get FRONTEND_URL() { return process.env.FRONTEND_URL ?? ''; },
} as const;

// 第三方运动平台对接配置（凭据需班级/企业向各平台申请；
// 未配置时对应平台接口如实返回 PROVIDER_NOT_ENABLED，不伪装已接入）
// 悦跑圈开放平台：https://open.thejoyrun.com
export const JOYRUN = {
  get CLIENT_ID() { return process.env.JOYRUN_CLIENT_ID ?? ''; },
  get CLIENT_SECRET() { return process.env.JOYRUN_CLIENT_SECRET ?? ''; },
  get REDIRECT_URI() { return process.env.JOYRUN_REDIRECT_URI ?? ''; }, // 一般为 https://<后端域名>/api/joyrun/callback
  get API_BASE() { return process.env.JOYRUN_API_BASE ?? 'https://open.thejoyrun.com'; },
  // 单次同步向前回溯天数（首次同步）
  get SYNC_LOOKBACK_DAYS() { return Number(process.env.JOYRUN_SYNC_LOOKBACK_DAYS ?? 30); },
  get ENABLED() { return Boolean(process.env.JOYRUN_CLIENT_ID && process.env.JOYRUN_CLIENT_SECRET); },
} as const;

// 运动校验引擎规则（配置化，环境变量可覆盖）
export const RULES = {
  MIN_DISTANCE_M: Number(process.env.RULE_MIN_DISTANCE_M ?? 100),
  MAX_DISTANCE_M: Number(process.env.RULE_MAX_DISTANCE_M ?? 100_000),
  MIN_DURATION_SEC: Number(process.env.RULE_MIN_DURATION_SEC ?? 60),
  MAX_DURATION_SEC: Number(process.env.RULE_MAX_DURATION_SEC ?? 86400),
  MIN_PACE_SEC: Number(process.env.RULE_MIN_PACE_SEC ?? 150), // 快于 2:30/km → rejected
  MAX_PACE_SEC: Number(process.env.RULE_MAX_PACE_SEC ?? 1500), // 慢于 25:00/km → pending
  MAX_GPS_JUMP_M: Number(process.env.RULE_MAX_GPS_JUMP_M ?? 500),
  MAX_GPS_JUMP_RATIO: Number(process.env.RULE_MAX_GPS_JUMP_RATIO ?? 0.05),
  MAX_POINT_ACCURACY_M: Number(process.env.RULE_MAX_POINT_ACCURACY_M ?? 60),
  MAX_BAD_ACCURACY_RATIO: Number(process.env.RULE_MAX_BAD_ACCURACY_RATIO ?? 0.5),
  MAX_TRACK_POINTS: Number(process.env.RULE_MAX_TRACK_POINTS ?? 50_000),
  MANUAL_REQUIRES_EVIDENCE: (process.env.RULE_MANUAL_REQUIRES_EVIDENCE ?? 'true') === 'true',
  MANUAL_MAX_KM_PER_DAY: Number(process.env.RULE_MANUAL_MAX_KM_PER_DAY ?? 42.2),
  MAX_SYNC_BATCH: Number(process.env.RULE_MAX_SYNC_BATCH ?? 50),
} as const;

// 华为运动健康开放平台（OAuth2.0）
export const HUAWEI = {
  get CLIENT_ID() { return process.env.HUAWEI_CLIENT_ID ?? ''; },
  get CLIENT_SECRET() { return process.env.HUAWEI_CLIENT_SECRET ?? ''; },
  get REDIRECT_URI() { return process.env.HUAWEI_REDIRECT_URI ?? ''; },
  get AUTH_BASE() { return process.env.HUAWEI_AUTH_BASE ?? 'https://oauth-login.cloud.huawei.com'; },
  get API_BASE() { return process.env.HUAWEI_API_BASE ?? 'https://health-api.cloud.huawei.com'; },
  get SYNC_LOOKBACK_DAYS() { return Number(process.env.HUAWEI_SYNC_LOOKBACK_DAYS ?? 30); },
  get ENABLED() { return Boolean(process.env.HUAWEI_CLIENT_ID && process.env.HUAWEI_CLIENT_SECRET); },
} as const;

// 佳明 Garmin Health API（OAuth 1.0a 三段式）
export const GARMIN = {
  get CONSUMER_KEY() { return process.env.GARMIN_CONSUMER_KEY ?? ''; },
  get CONSUMER_SECRET() { return process.env.GARMIN_CONSUMER_SECRET ?? ''; },
  get REDIRECT_URI() { return process.env.GARMIN_REDIRECT_URI ?? ''; },
  get AUTH_BASE() { return process.env.GARMIN_AUTH_BASE ?? 'https://connectapi.garmin.com'; },
  get CONFIRM_BASE() { return process.env.GARMIN_CONFIRM_BASE ?? 'https://connect.garmin.com'; },
  get API_BASE() { return process.env.GARMIN_API_BASE ?? 'https://apis.garmin.com'; },
  get SYNC_LOOKBACK_DAYS() { return Number(process.env.GARMIN_SYNC_LOOKBACK_DAYS ?? 30); },
  get ENABLED() { return Boolean(process.env.GARMIN_CONSUMER_KEY && process.env.GARMIN_CONSUMER_SECRET); },
} as const;
