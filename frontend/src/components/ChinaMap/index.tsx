import { useEffect, useRef, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { MapChart, ScatterChart, LinesChart } from 'echarts/charts';
import { TooltipComponent, GeoComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';

import { buildBaseMapOption, buildRouteLineSeries } from './option';
import type { ChinaMapProps } from './types';
import chinaGeoJSON from '../../data/china.json';
import { useProgressStore } from '../../store/progressStore';
import { useGlobalStore } from '../../store/globalProgressStore';
import { calcRunnerPosition } from '../RunnerMarker/calcPosition';
import { getGeometrySegments, interpolateOnGeometry } from '../../data/routeGeometryLoader';

echarts.use([MapChart, ScatterChart, LinesChart, GeoComponent, TooltipComponent, CanvasRenderer]);

/** 根据平均虚拟公里在 geometry 上定位 */
function calcGlobalRunnerPosition(avgVirtualKm: number): {
  position: [number, number]; fromCity: string; toCity: string;
  ratio: number; routeKm: number; description: string; remainingKm: number;
} {
  const distances = [
    0, 570, 830, 1150, 1410, 1630, 1930, 2470, 2980, 3460, 4600, 4730,
    5414, 5680, 5963, 6263, 6763, 6963, 7993, 8643, 8823, 9373, 9813,
    10033, 10373, 10983, 11403, 12003, 12483, 13033, 13503, 13763, 14863,
    15963, 16233, 16633, 17633, 17813, 17993, 18323, 18833, 19233, 19623,
    19853, 20103, 20403, 20863, 21283,
  ];
  const cities = [
    '深圳', '厦门', '福州', '温州', '宁波', '上海', '南京', '武汉',
    '郑州', '西安', '天津', '北京', '沈阳', '长春', '哈尔滨', '齐齐哈尔',
    '呼伦贝尔', '满洲里', '锡林浩特', '呼和浩特', '包头', '银川', '兰州',
    '西宁', '张掖', '敦煌', '哈密', '乌鲁木齐', '库尔勒', '阿克苏',
    '喀什', '叶城', '阿里（狮泉河）', '日喀则', '拉萨', '林芝',
    '香格里拉', '丽江', '大理', '昆明', '贵阳', '桂林', '南宁',
    '北海', '海口', '三亚', '湛江', '广州',
  ];

  if (avgVirtualKm <= 0) return {
    position: [114.07, 22.54], fromCity: '深圳', toCity: '深圳',
    ratio: 0, routeKm: 0, description: '环游起点', remainingKm: 570,
  };

  for (let i = distances.length - 1; i >= 0; i--) {
    if (avgVirtualKm >= distances[i]) {
      const fromIdx = i;
      const toIdx = Math.min(i + 1, distances.length - 1);
      const segLen = distances[toIdx] - distances[fromIdx];
      const ratio = segLen > 0 ? (avgVirtualKm - distances[fromIdx]) / segLen : 0;

      // 在 geometry 上插值
      const position = interpolateOnGeometry(fromIdx, segLen, Math.min(ratio, 0.99));
      const remainingKm = toIdx < distances.length - 1 ? distances[toIdx] - avgVirtualKm : 0;

      return {
        position,
        fromCity: cities[fromIdx],
        toCity: cities[toIdx],
        ratio,
        routeKm: avgVirtualKm,
        description: `全民平均位置 · ${cities[fromIdx]}→${cities[toIdx]}`,
        remainingKm: Math.max(0, remainingKm),
      };
    }
  }

  return {
    position: [114.07, 22.54], fromCity: '深圳', toCity: '深圳',
    ratio: 1, routeKm: 21423, description: '🏁 完成', remainingKm: 0,
  };
}

export default function ChinaMap({ className = '', height, mode = 'personal', globalPosition: _gp, globalCity: _gc }: ChinaMapProps) {
  const chartRef = useRef<ReactEChartsCore>(null);
  const [mapRegistered, setMapRegistered] = useState(false);
  const [option, setOption] = useState<EChartsOption | null>(null);

  const virtualKm = useProgressStore((s) => s.info.virtualKm);
  const globalVirtualKm = useGlobalStore((s) => s.progress.averageVirtualKm);
  const allRunners = useGlobalStore((s) => s.progress.allRunners);
  const globalStatus = useGlobalStore((s) => s.status);

  useEffect(() => {
    try {
      echarts.registerMap('china', chinaGeoJSON as unknown as Parameters<typeof echarts.registerMap>[1]);
      setMapRegistered(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!mapRegistered) return;

    if (mode === 'personal') {
      const base = buildBaseMapOption();
      const routeSeries = buildRouteLineSeries(virtualKm);
      const runnerPos = calcRunnerPosition(virtualKm);

      const baseSeries = base.series as object[];
      const geoSegments = getGeometrySegments();
      const updatedBaseSeries = baseSeries.map((s, i) => {
        if (i === 1) {
          const matchSeg = geoSegments.find(
            (seg) => seg.from_city === runnerPos.fromCity && seg.to_city === runnerPos.toCity
          );
          return {
            ...(s as object),
            data: [{
              name: '🏃 我的位置',
              value: runnerPos.position,
              fromCity: runnerPos.fromCity, toCity: runnerPos.toCity,
              ratio: runnerPos.ratio, routeKm: runnerPos.routeKm,
              description: runnerPos.nearbyDescription,
              province: runnerPos.fromNode?.province ?? '',
              roadName: matchSeg?.route_source || '',
              remainingKm: runnerPos.toNode
                ? Math.max(0, runnerPos.toNode.totalDistanceKm - runnerPos.routeKm) : 0,
              mode: 'personal',
            }],
          };
        }
        return s;
      });

      setOption({ ...base, series: [...updatedBaseSeries, ...routeSeries] });
    } else {
      // ===== 全民模式：绿色跑者 + 路线高亮 =====
      const base = buildBaseMapOption();
      if (globalStatus !== 'ready') {
        setOption(base);
        return;
      }
      // 隐藏个人跑者
      const baseSeries = (base.series as object[]).map((s, i) => {
        if (i === 1) return { ...(s as object), data: [], label: { show: false } };
        return s;
      });

      // 全民路线高亮
      const routeSeries = buildRouteLineSeries(globalVirtualKm);

      // 全民跑者位置（沿真实道路）
      const gr = calcGlobalRunnerPosition(globalVirtualKm);
      const totalRunKmSum = allRunners.reduce((s, r) => s + r.totalRunKm, 0);

      // 绿色跑者 marker
      const globalRunnerSeries: object[] = [{
        name: '全民位置',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: [{
          name: '🏃 全民位置',
          value: gr.position,
          fromCity: gr.fromCity, toCity: gr.toCity,
          ratio: gr.ratio, routeKm: gr.routeKm,
          remainingKm: gr.remainingKm,
          description: gr.description,
          totalRunKm: totalRunKmSum,
          participants: allRunners.length,
          mode: 'global',
        }],
        symbol: 'circle',
        symbolSize: 0.01,
        label: {
          show: true, formatter: '🏃', fontSize: 28,
          position: 'inside', color: '#81c784',
          textShadowBlur: 10, textShadowColor: 'rgba(0,0,0,0.6)',
        },
        emphasis: { label: { fontSize: 32 } },
        zlevel: 2, z: 10,
      }];

      setOption({ ...base, series: [...baseSeries, ...globalRunnerSeries, ...routeSeries] });
    }
  }, [mapRegistered, mode, virtualKm, globalVirtualKm, allRunners, globalStatus]);

  useEffect(() => {
    const handleResize = () => chartRef.current?.getEchartsInstance()?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mapHeight = height ?? '60vh';

  if (!mapRegistered || !option) {
    return (
      <div className={className} style={{
        height: mapHeight, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem',
      }}>
        加载地图中...
      </div>
    );
  }

  return (
    <ReactEChartsCore
      ref={chartRef} echarts={echarts} option={option}
      style={{ height: mapHeight, width: '100%' }} className={className}
      notMerge lazyUpdate opts={{ renderer: 'canvas' }}
    />
  );
}
