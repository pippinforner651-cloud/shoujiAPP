// Web GPS 适配器：浏览器 Geolocation API（仅前台）
import type { SportDataProvider, ProviderFix } from './types';

const ACCURACY_LIMIT_M = 40; // 与跑步页一致的漂移过滤阈值

export const webGpsProvider: SportDataProvider = {
  key: 'web-gps',
  name: '浏览器 GPS（前台）',
  status: 'ready',

  isAvailable() {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  },

  start(onFix: (fix: ProviderFix) => void, onError: (msg: string) => void) {
    if (!this.isAvailable()) {
      onError('当前环境不支持浏览器定位');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        if (p.coords.accuracy > ACCURACY_LIMIT_M) return; // 丢弃漂移点
        onFix({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          accuracyM: Math.round(p.coords.accuracy),
          timestamp: p.timestamp || Date.now(),
        });
      },
      (err) => {
        onError(err.code === 1
          ? '定位权限被拒绝：请在浏览器/系统设置中允许定位后重试'
          : '暂时无法获取定位（信号弱或超时）');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 },
    );
    this._watchId = id;
  },

  stop() {
    if (this._watchId != null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
  },

  _watchId: null as number | null,
} as SportDataProvider & { _watchId: number | null };
