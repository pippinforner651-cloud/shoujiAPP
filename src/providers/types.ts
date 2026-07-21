// 运动数据适配器统一接口
// 已就绪：manual（手动补录）/ web-gps（浏览器定位）/ native-gps（Android前台Service）/ joyrun（GPX/TCX 文件导入 + 凭证补录，非流式）
// 预留：watch（运动手表）——接口已定义，接入方就位后实现，不伪装数据。

export interface ProviderFix {
  lat: number;
  lon: number;
  accuracyM: number | null;
  timestamp: number; // epoch ms
}

export type ProviderStatus = 'ready' | 'reserved' | 'unavailable';

export interface SportDataProvider {
  key: 'manual' | 'web-gps' | 'native-gps' | 'android-gps' | 'watch' | 'joyrun';
  name: string;
  status: ProviderStatus;
  /** 当前运行环境是否可用 */
  isAvailable(): boolean | Promise<boolean>;
  /** 开始推送定位点（流式来源）；手动补录等一次性来源不实现 */
  start?(onFix: (fix: ProviderFix) => void, onError: (msg: string) => void): void | Promise<void>;
  stop?(): void;
}
