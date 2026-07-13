/**
 * Apple Watch 模拟数据
 *
 * 模拟从 Apple Watch 同步的运动数据。
 * 测试场景：57km 真实跑步 → 570km 虚拟 → 深圳→厦门
 */
import type { SimpleActivityInput } from '../services/activity/activityAdapter';

/** 获取今天的日期字符串 YYYY-MM-DD */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 生成模拟 Apple Watch 跑步数据
 * 总距离 57km，分 3 条记录模拟真实场景
 */
export function generateMockAppleWatchData(): SimpleActivityInput[] {
  const todayStr = today();

  // 3 条记录：模拟一周内的 3 次跑步
  return [
    {
      source: 'healthkit',
      date: todayStr,
      distanceKm: 21.1,        // 半马
      durationMin: 105,
      calories: 1250,
      deviceName: 'Apple Watch Ultra',
      note: '晨跑·半马训练',
    },
    {
      source: 'healthkit',
      date: todayStr,
      distanceKm: 15.0,
      durationMin: 75,
      calories: 890,
      deviceName: 'Apple Watch Ultra',
      note: '恢复跑',
    },
    {
      source: 'healthkit',
      date: todayStr,
      distanceKm: 20.9,        // 凑满 57km
      durationMin: 110,
      calories: 1240,
      deviceName: 'Apple Watch Ultra',
      note: '周末长距离',
    },
  ];
}
