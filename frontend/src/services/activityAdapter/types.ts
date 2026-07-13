/**
 * 活动适配器类型
 */
import type { ActivitySource } from '../../types/activity';

/** 来源标签映射 */
export const SOURCE_LABELS: Record<ActivitySource, string> = {
  manual: '手动录入',
  apple_health: 'Apple Watch',
  huawei_health: '华为运动健康',
  garmin: 'Garmin',
  xiaomi: '小米运动',
  wechat: '微信运动',
  gps: 'GPS',
};

/** 来源 emoji */
export const SOURCE_EMOJIS: Record<ActivitySource, string> = {
  manual: '✏️',
  apple_health: '🍎',
  huawei_health: '📱',
  garmin: '⌚',
  xiaomi: '💪',
  wechat: '💬',
  gps: '📡',
};
