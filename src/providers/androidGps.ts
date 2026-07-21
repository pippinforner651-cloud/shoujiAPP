// Android 原生 GPS 适配器：通过 Capacitor Core 可选插件探测定位能力。
// 根依赖未安装定位插件时，Web 和原生容器都会安全降级为不可用。
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { SportDataProvider, ProviderFix } from './types';

const ACCURACY_LIMIT_M = 40;

interface NativePosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
  timestamp?: number;
}

interface OptionalGeolocationPlugin {
  requestPermissions(): Promise<{ location?: string }>;
  watchPosition(
    options: { enableHighAccuracy: boolean; timeout: number; maximumAge: number },
    callback: (position?: NativePosition | null, error?: unknown) => void,
  ): Promise<string>;
  clearWatch(options: { id: string }): Promise<void>;
}

const Geolocation = registerPlugin<OptionalGeolocationPlugin>('Geolocation');

function hasNativeGeolocation(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Geolocation');
}

export const androidGpsProvider: SportDataProvider = {
  key: 'android-gps',
  name: 'Android 原生 GPS',
  status: hasNativeGeolocation() ? 'ready' : 'unavailable',

  isAvailable() {
    return hasNativeGeolocation();
  },

  async start(onFix: (fix: ProviderFix) => void, onError: (msg: string) => void) {
    if (!this.isAvailable()) {
      onError('原生定位插件不可用：请使用浏览器定位或室内/演示模式');
      return;
    }
    try {
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== 'granted') {
        onError('定位权限被拒绝：请在系统设置中允许定位后重试');
        return;
      }
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 },
        (p, err) => {
          if (err || !p) {
            onError('暂时无法获取定位（信号弱或超时）');
            return;
          }
          const acc = p.coords.accuracy ?? 999;
          if (acc > ACCURACY_LIMIT_M) return;
          onFix({
            lat: p.coords.latitude,
            lon: p.coords.longitude,
            accuracyM: Math.round(acc),
            timestamp: p.timestamp || Date.now(),
          });
        },
      );
      (this as { _id?: string })._id = id;
    } catch (e) {
      onError(e instanceof Error ? e.message : '原生定位启动失败');
    }
  },

  stop() {
    const id = (this as { _id?: string })._id;
    if (id) {
      Geolocation.clearWatch({ id }).catch(() => {});
      (this as { _id?: string })._id = undefined;
    }
  },
};
