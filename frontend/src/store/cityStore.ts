/**
 * 城市解锁 Store
 *
 * 职责：
 * - 检测跑量是否到达新城市
 * - 管理已解锁城市列表
 * - localStorage 持久化
 * - 触发 CityBottomSheet 显示
 */

import { create } from 'zustand';
import { getRouteData } from '../data/routeLoader';
import { SCALE_RATIO } from '../types/progress';
import type { CityUnlock, CityStorage } from '../types/city';
import { CITY_STORAGE_KEY, CITY_STORAGE_VERSION } from '../types/city';

/* ===== localStorage ===== */

function loadCities(): CityUnlock[] {
  try {
    const raw = localStorage.getItem(CITY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CityStorage;
    return parsed.version === CITY_STORAGE_VERSION ? parsed.unlockedCities : [];
  } catch {
    return [];
  }
}

function saveCities(cities: CityUnlock[]): void {
  try {
    const data: CityStorage = {
      version: CITY_STORAGE_VERSION,
      unlockedCities: cities,
    };
    localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // silent
  }
}

/* ===== 城市检测逻辑 ===== */

/**
 * 检测是否有新城市到达
 * 规则：返回所有 totalDistanceKm ≤ virtualKm 且尚未解锁的城市
 */
function detectNewCities(virtualKm: number, alreadyUnlocked: Set<string>): CityUnlock[] {
  const { nodes } = getRouteData();
  const results: CityUnlock[] = [];

  for (const node of nodes) {
    // 已解锁的城市跳过
    if (alreadyUnlocked.has(node.city)) continue;

    // 深圳起点默认已解锁
    if (node.order === 1 && !alreadyUnlocked.has(node.city)) {
      results.push({
        city: node.city,
        province: node.province,
        unlockKm: 0,
        unlockedAt: new Date().toISOString(),
        order: node.order,
        description: node.description,
        difficulty: node.difficulty,
      });
      alreadyUnlocked.add(node.city);
      continue;
    }

    // 到达该城市的累计虚拟公里
    if (virtualKm >= node.totalDistanceKm) {
      results.push({
        city: node.city,
        province: node.province,
        unlockKm: node.totalDistanceKm,
        unlockedAt: new Date().toISOString(),
        order: node.order,
        description: node.description,
        difficulty: node.difficulty,
      });
    }
  }

  return results;
}

/* ===== Store ===== */

interface CityState {
  /** 所有已解锁城市 */
  unlockedCities: CityUnlock[];
  /** 当前弹窗显示的城市（null=不显示） */
  alertCity: CityUnlock | null;
  /** 是否已初始化 */
  initialized: boolean;

  /** 初始化 */
  initialize: () => void;
  /**
   * 检查并解锁新城市
   * @param realKm 真实跑步公里
   * @returns 新解锁的城市列表（可能空）
   */
  checkAndUnlock: (realKm: number) => CityUnlock[];
  /** 关闭弹窗 */
  dismissAlert: () => void;
  /** 获取已解锁城市名称集合 */
  getUnlockedSet: () => Set<string>;
}

export const useCityStore = create<CityState>((set, get) => ({
  unlockedCities: [],
  alertCity: null,
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    const cities = loadCities();

    // 首次使用：自动解锁深圳（起点）
    if (cities.length === 0) {
      const { nodes } = getRouteData();
      const shenzhen = nodes.find((n) => n.order === 1);
      if (shenzhen) {
        const startCity: CityUnlock = {
          city: shenzhen.city,
          province: shenzhen.province,
          unlockKm: 0,
          unlockedAt: new Date().toISOString(),
          order: 1,
          description: shenzhen.description,
          difficulty: shenzhen.difficulty,
        };
        cities.push(startCity);
        saveCities(cities);
      }
    }

    set({ unlockedCities: cities, initialized: true });
  },

  checkAndUnlock: (realKm: number) => {
    const virtualKm = realKm * SCALE_RATIO;
    const unlockedMap = new Set(get().unlockedCities.map((c) => c.city));
    const newCities = detectNewCities(virtualKm, unlockedMap);

    if (newCities.length === 0) return [];

    const allCities = [...get().unlockedCities, ...newCities];
    saveCities(allCities);
    set({ unlockedCities: allCities });

    // 触发弹窗（只弹第一个新到达的城市）
    const firstNew = newCities[0];
    if (firstNew && get().alertCity === null) {
      set({ alertCity: firstNew });
    }

    return newCities;
  },

  dismissAlert: () => {
    set({ alertCity: null });
  },

  getUnlockedSet: () => {
    return new Set(get().unlockedCities.map((c) => c.city));
  },
}));
