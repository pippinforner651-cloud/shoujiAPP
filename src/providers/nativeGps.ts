// ============================================================
// E23跑起来 · 原生安卓GPS适配器（真实前台Service）
// 使用 GpsRun Capacitor 插件调用 Android Foreground Service
// 所有GPS采集、轨迹持久化、活动管理在原生层完成
// React层仅负责展示和用户操作
// ============================================================
import { Capacitor } from '@capacitor/core';
import type { SportDataProvider } from './types';

export const nativeGpsProvider: SportDataProvider = {
  key: 'native-gps',
  name: 'E23 GPS（前台服务）',
  status: 'ready',

  isAvailable() {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GpsRun');
  },
};
