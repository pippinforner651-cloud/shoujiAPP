// ============================================================
// E23跑起来 · 第三方数据接入层（接口预留）
// 真实接入所需条件：
//  1. 微信登录/微信运动：需微信开放平台企业资质 + AppID/AppSecret + 后端换取 session
//  2. 悦跑圈：需与悦跑圈开放平台合作获取 API 授权（当前无公开个人API）
//  3. 运动手表（佳明/华为/苹果）：需接入各家 Health Connect / HealthKit / Garmin API
// 以上均需要后端服务中转，本层定义统一数据契约，后端就绪后替换实现即可
// ============================================================

import type { MapPack } from '../data/route';
import { CHINA_LOOP_PACK } from '../data/route';

export interface ExternalRunData {
  source: 'wechat' | 'joyrun' | 'garmin' | 'huawei' | 'apple';
  km: number;
  durationSec: number;
  ts: number;
}

export interface IntegrationStatus {
  key: ExternalRunData['source'];
  name: string;
  desc: string;
  connected: boolean;
  requirement: string; // 真实接入条件
}

export const INTEGRATIONS: IntegrationStatus[] = [
  { key: 'wechat', name: '微信运动', desc: '同步微信步数/运动数据', connected: false, requirement: '需微信开放平台审核通过的移动应用 + 后端服务' },
  { key: 'joyrun', name: '悦跑圈', desc: '导入悦跑圈跑步记录', connected: false, requirement: '需悦跑圈开放平台商务合作授权' },
  { key: 'garmin', name: '佳明手表', desc: '实时同步手表跑步数据', connected: false, requirement: '需注册 Garmin Health API 开发者' },
  { key: 'huawei', name: '华为运动健康', desc: '同步华为手表/手环数据', connected: false, requirement: '需华为运动健康开放平台申请' },
  { key: 'apple', name: 'Apple Health', desc: '同步苹果手表数据', connected: false, requirement: '需 iOS 原生端 HealthKit 授权' },
];

// 未来数据源的统一入口：后端就绪后，从这里拉取外部跑步数据写入 store.records
export async function fetchExternalRuns(_source: ExternalRunData['source']): Promise<ExternalRunData[]> {
  return []; // 预留：返回空，等待真实 API
}

// ---- 地图包系统（全球跑预留 / 支持导入他人地图） ----
export function validateMapPack(raw: unknown): MapPack | null {
  const p = raw as MapPack;
  if (!p || typeof p !== 'object') return null;
  if (!Array.isArray(p.nodes) || p.nodes.length < 2) return null;
  for (const n of p.nodes) {
    if (typeof n.lon !== 'number' || typeof n.lat !== 'number' || typeof n.segKm !== 'number') return null;
  }
  return {
    packId: String(p.packId || 'custom-pack'),
    name: String(p.name || '自定义地图'),
    version: String(p.version || '1.0.0'),
    totalKm: p.nodes.reduce((s, n) => s + n.segKm, 0),
    loop: Boolean(p.loop),
    nodes: p.nodes.map((n, i) => ({
      id: i, name: String(n.name || `站点${i + 1}`), lon: n.lon, lat: n.lat,
      segKm: n.segKm, road: String(n.road || ''), province: String(n.province || ''),
      spots: Array.isArray(n.spots) ? n.spots.map(String) : [],
      foods: Array.isArray(n.foods) ? n.foods.map(String) : [],
      cumKm: 0, // 由 normalize 重算
    })),
  };
}

export function getActivePack(customJson: string | null): MapPack {
  if (customJson) {
    try {
      const p = validateMapPack(JSON.parse(customJson));
      if (p) {
        let cum = 0;
        p.nodes = p.nodes.map((n) => { cum += n.segKm; return { ...n, cumKm: cum }; });
        p.totalKm = cum;
        return p;
      }
    } catch { /* fallthrough */ }
  }
  return CHINA_LOOP_PACK;
}
