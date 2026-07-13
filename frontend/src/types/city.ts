/* 城市解锁类型 */

/** 已解锁城市记录 */
export interface CityUnlock {
  /** 城市名称 */
  city: string;
  /** 省份 */
  province: string;
  /** 解锁时的虚拟公里数 */
  unlockKm: number;
  /** 解锁时间（ISO 8601） */
  unlockedAt: string;
  /** 城市在路线中的序号（1-48） */
  order: number;
  /** 景点描述 */
  description: string;
  /** 难度 */
  difficulty: string;
}

/** localStorage 存储结构 */
export interface CityStorage {
  version: number;
  unlockedCities: CityUnlock[];
}

export const CITY_STORAGE_KEY = 'vr_china_city_v1';
export const CITY_STORAGE_VERSION = 1;
