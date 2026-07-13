/**
 * 活动适配器类型 — 来源标签映射
 *
 * 使用正式 ActivitySource 枚举，旧值通过 normalizeActivitySource 转换。
 */
import type { ActivitySource } from '../../types/activity';

/** 来源标签映射（仅限正式枚举） */
export const SOURCE_LABELS: Record<ActivitySource, string> = {
  app_gps:        '本机GPS',
  health_connect: 'Health Connect',
  healthkit:      'Apple健康',
  coros:          'COROS',
  joyrun:         '悦跑圈',
  wechat:         '微信运动',
  gpx_import:     'GPX导入',
  fit_import:     'FIT导入',
  manual:         '手动录入',
};

/** 来源 emoji（仅限正式枚举） */
export const SOURCE_EMOJIS: Record<ActivitySource, string> = {
  app_gps:        '📱',
  health_connect: '🤖',
  healthkit:      '🍎',
  coros:          '⌚',
  joyrun:         '🏃',
  wechat:         '💬',
  gpx_import:     '📂',
  fit_import:     '📂',
  manual:         '✏️',
};
