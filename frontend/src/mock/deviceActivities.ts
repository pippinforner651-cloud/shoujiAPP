/**
 * 模拟设备运动数据
 *
 * 模拟 Apple Watch / 华为手表 两种设备的同步数据。
 * 数据通过 adapter 进入统一 RunRecord 流程。
 */
import { createMockWatchInput } from '../services/activityAdapter/mockAppleAdapter';
import type { ExternalActivityInput } from '../types/activity';

/** 生成模拟 Apple Watch 跑步数据 */
export function generateAppleWatchActivity(): ExternalActivityInput {
  return createMockWatchInput({
    source: 'healthkit',
    distanceKm: 8.2,
    durationSec: 45 * 60 + 30, // 45分30秒
    calories: 520,
    deviceName: 'Apple Watch Ultra 2',
  });
}

/** 生成模拟华为手表跑步数据 */
export function generateHuaweiWatchActivity(): ExternalActivityInput {
  return createMockWatchInput({
    source: 'health_connect',
    distanceKm: 6.5,
    durationSec: 38 * 60 + 15, // 38分15秒
    calories: 410,
    deviceName: 'HUAWEI WATCH GT 4',
  });
}

/** 生成多条模拟设备数据（一次同步多条） */
export function generateBatchDeviceActivities(): ExternalActivityInput[] {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  return [
    // Apple Watch - 早上 7:30
    {
      source: 'healthkit',
      device: { name: 'Apple Watch Ultra 2', model: 'Ultra 2' },
      activityType: 'running',
      distanceKm: 8.2,
      durationSec: 45 * 60 + 30,
      calories: 520,
      startTime: `${today}T07:30:00`,
      note: '晨跑 · 户外',
    },
    // 华为手表 - 晚上 18:00
    {
      source: 'health_connect',
      device: { name: 'HUAWEI WATCH GT 4', model: 'GT 4' },
      activityType: 'running',
      distanceKm: 6.5,
      durationSec: 38 * 60 + 15,
      calories: 410,
      startTime: `${today}T18:00:00`,
      note: '夜跑 · 公园',
    },
  ];
}
