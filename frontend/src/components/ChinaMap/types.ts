/* ChinaMap 组件类型定义 */

/** 地图显示模式 */
export type MapMode = 'personal' | 'global';

/** 组件 Props */
export interface ChinaMapProps {
  /** 地图容器样式（用于响应式控制） */
  className?: string;
  /** 容器高度（默认: '60vh' 手机 / 550px PC） */
  height?: string | number;
  /** 地图模式 */
  mode?: MapMode;
  /** 全民位置（[lng, lat]） */
  globalPosition?: [number, number];
  /** 全民到达城市名 */
  globalCity?: string;
}

/** ECharts map 系列数据项 */
export interface MapSeriesData {
  name: string;
  value: number;
}

/** 省份数据统计（预留） */
export interface ProvinceStat {
  provinceName: string;
  value?: number;
  unlocked?: boolean;
}
