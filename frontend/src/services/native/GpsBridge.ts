/**
 * GpsBridge — Capacitor GpsPlugin 的 TypeScript 接口
 *
 * 提供统一 API，供 GPS 测试中心和正式户外跑调用。
 * 如果原生插件不可用，自动降级到 navigator.geolocation。
 */
import type { PluginListenerHandle } from '@capacitor/core';

declare global {
  interface Window {
    Capacitor?: {
      isPluginAvailable: (name: string) => boolean;
      convertFileSrc: (path: string) => string;
    };
    android?: {
      GpsPlugin?: unknown;
    };
  }
}

/* ===== 类型定义 ===== */

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  bearing?: number;
  time?: number;
  provider?: string;
  callbackCount?: number;
}

export interface EngineStatus {
  isRunning: boolean;
  callbackCount: number;
  lastCallbackTime: number;
  lastProvider: string;
  lastLocation: GpsLocation | null;
}

export interface SingleFixResult {
  success: boolean;
  location?: GpsLocation;
  detail: string;
}

/* ===== 内部状态 ===== */
let fallbackWatchId: number | null = null;
let fallbackCallback: ((loc: GpsLocation) => void) | null = null;
let listenerHandles: PluginListenerHandle[] = [];

/* ===== 检测原生插件 ===== */
function checkPlugin(): boolean {
  try {
    if (typeof window !== 'undefined' && window.Capacitor) {
      if (window.Capacitor.isPluginAvailable('GpsPlugin')) {
        return true;
      }
    }
  } catch { /* ignore */ }
  return false;
}

/* ===== 动态导入 Capacitor 插件 ===== */
async function getPlugin(): Promise<any> {
  if (!checkPlugin()) return null;
  try {
    const { registerPlugin } = await import('@capacitor/core');
    const plugin = registerPlugin<any>('GpsPlugin');
    return plugin;
  } catch {
    return null;
  }
}

/* ===== Engine API ===== */

export async function startEngine(): Promise<boolean> {
  const plugin = await getPlugin();
  if (plugin) {
    try {
      await plugin.startEngine();
      return true;
    } catch (e) {
      console.warn('[GpsBridge] Plugin startEngine failed:', e);
      return startFallback();
    }
  }
  return startFallback();
}

export async function stopEngine(): Promise<boolean> {
  // 先清理 fallback
  if (fallbackWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(fallbackWatchId);
    fallbackWatchId = null;
    fallbackCallback = null;
  }

  const plugin = await getPlugin();
  if (plugin) {
    try {
      await plugin.stopEngine();
      return true;
    } catch (e) {
      console.warn('[GpsBridge] Plugin stopEngine failed:', e);
      return false;
    }
  }
  return true;
}

export async function getEngineStatus(): Promise<EngineStatus> {
  const plugin = await getPlugin();
  if (plugin) {
    try {
      const status = await plugin.getEngineStatus();
      return status as EngineStatus;
    } catch {
      // fallback
    }
  }
  return {
    isRunning: fallbackWatchId !== null,
    callbackCount: 0,
    lastCallbackTime: 0,
    lastProvider: 'fallback',
    lastLocation: null,
  };
}

export async function requestSingleFix(): Promise<SingleFixResult> {
  const plugin = await getPlugin();
  if (plugin) {
    try {
      const result = await plugin.requestSingleFix();
      return result as SingleFixResult;
    } catch {
      // fallback to web API
    }
  }
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ success: false, detail: 'geolocation not available' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          success: true,
          location: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude ?? undefined,
            speed: pos.coords.speed ?? undefined,
            provider: 'gps_fallback',
          },
          detail: 'single_gps_fallback',
        });
      },
      (err) => {
        resolve({ success: false, detail: `fallback error: ${err.message}` });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

/* ===== 持续定位监听 ===== */

export function onLocationUpdate(callback: (loc: GpsLocation) => void): () => void {
  getPlugin().then((plugin) => {
    if (plugin) {
      plugin.addListener('locationUpdate', (data: GpsLocation) => {
        callback(data);
      }).then((handle: PluginListenerHandle) => {
        listenerHandles.push(handle);
      }).catch(() => {
        startFallbackWithCallback(callback);
      });
    } else {
      startFallbackWithCallback(callback);
    }
  });
  return () => cleanup();
}

function startFallbackWithCallback(callback: (loc: GpsLocation) => void) {
  fallbackCallback = callback;
  startFallback();
}

async function startFallback(): Promise<boolean> {
  if (!navigator.geolocation) {
    console.warn('[GpsBridge] navigator.geolocation unavailable');
    return false;
  }
  try {
    fallbackWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: GpsLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
          altitude: pos.coords.altitude ?? undefined,
          speed: pos.coords.speed ?? undefined,
          provider: 'gps_fallback',
        };
        if (fallbackCallback) fallbackCallback(loc);
      },
      (err) => {
        console.warn('[GpsBridge] Fallback watch error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 },
    );
    return true;
  } catch (e) {
    console.warn('[GpsBridge] Fallback start failed:', e);
    return false;
  }
}

export function cleanup(): void {
  if (fallbackWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(fallbackWatchId);
    fallbackWatchId = null;
  }
  fallbackCallback = null;
  listenerHandles.forEach((h) => {
    try { h.remove(); } catch { /* ignore */ }
  });
  listenerHandles = [];
}

/* ===== 户外跑 Service API ===== */

export async function startRun(activityId: string): Promise<boolean> {
  const plugin = await getPlugin();
  if (plugin) {
    try {
      await plugin.startRun({ activityId });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function pauseRun(): Promise<boolean> {
  const plugin = await getPlugin();
  if (plugin) {
    try { await plugin.pauseRun(); return true; } catch { return false; }
  }
  return false;
}

export async function resumeRun(): Promise<boolean> {
  const plugin = await getPlugin();
  if (plugin) {
    try { await plugin.resumeRun(); return true; } catch { return false; }
  }
  return false;
}

export async function stopRun(): Promise<boolean> {
  await stopEngine();
  const plugin = await getPlugin();
  if (plugin) {
    try { await plugin.stopRun(); return true; } catch { return false; }
  }
  return false;
}

/* ===== 初始化检查 ===== */
export function isNativeAvailable(): boolean {
  return checkPlugin();
}
