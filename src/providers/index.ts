// 适配器注册表：自动选择当前环境最优 GPS 来源；预留手表/悦跑圈接口
import type { SportDataProvider } from './types';
import { webGpsProvider } from './webGps';
import { androidGpsProvider } from './androidGps';
import { nativeGpsProvider } from './nativeGps';

/** 手动补录：非流式来源，入口在跑步页 manual 表单 */
export const manualProvider: SportDataProvider = {
  key: 'manual',
  name: '手动补录',
  status: 'ready',
  isAvailable: () => true,
};

/** 预留：运动手表（佳明/华为/苹果）。接入方提供数据授权前保持 reserved，不生成任何数据 */
export const watchProvider: SportDataProvider = {
  key: 'watch',
  name: '运动手表（预留）',
  status: 'reserved',
  isAvailable: () => false,
};

/** 悦跑圈：非流式来源。无公开同步接口，采用「GPX/TCX 文件导入 + 凭证补录」两条真实链路，
 *  入口在「我的 → 设备与数据来源 → 悦跑圈」。后端 ActivitySource.joyrun 与服务端校验已就绪。 */
export const joyrunProvider: SportDataProvider = {
  key: 'joyrun',
  name: '悦跑圈（文件/凭证导入）',
  status: 'ready',
  isAvailable: () => true,
};

export const PROVIDERS: SportDataProvider[] = [
  nativeGpsProvider,
  androidGpsProvider,
  webGpsProvider,
  manualProvider,
  watchProvider,
  joyrunProvider,
];

/** 取当前环境最优的流式 GPS 适配器：原生容器 → 浏览器 */
export function pickGpsProvider(): SportDataProvider {
  if (nativeGpsProvider.isAvailable()) return nativeGpsProvider;
  if (androidGpsProvider.isAvailable()) return androidGpsProvider;
  return webGpsProvider;
}
