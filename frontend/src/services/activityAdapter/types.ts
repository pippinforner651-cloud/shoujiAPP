/**
 * 活动适配器类型
 *
 * Phase 6.3 — 使用新的 9 种 ActivitySource 枚举。
 * 兼容旧值通过字符串索引访问（Record<string, string>）。
 */

/** 来源标签映射 */
export const SOURCE_LABELS: Record<string, string> = {
  // 新 9 种枚举
  app_gps: '本机GPS',
  health_connect: 'Health Connect',
  healthkit: 'Apple健康',
  coros: 'COROS',
  joyrun: '悦跑圈',
  wechat: '微信运动',
  gpx_import: 'GPX导入',
  fit_import: 'FIT导入',
  manual: '手动录入',
  // 旧兼容
  apple_health: 'Apple Watch',
  huawei_health: '华为运动健康',
  garmin: 'Garmin',
  xiaomi: '小米运动',
  gps: 'GPS',
  mock: '模拟同步',
};

/** 来源 emoji */
export const SOURCE_EMOJIS: Record<string, string> = {
  app_gps: '📱',
  health_connect: '🤖',
  healthkit: '🍎',
  coros: '⌚',
  joyrun: '🏃',
  wechat: '💬',
  gpx_import: '📂',
  fit_import: '📂',
  manual: '✏️',
  apple_health: '🍎',
  huawei_health: '📱',
  garmin: '⌚',
  xiaomi: '💪',
  gps: '📡',
  mock: '🧪',
};
