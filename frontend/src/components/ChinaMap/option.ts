import type { EChartsOption } from 'echarts';
import { getCityCoords } from '../../data/routeLoader';
import { splitRouteByProgress } from '../../utils/routeProgress';

/**
 * 构建基础地图 option（不含路线连线）
 * 系列索引：
 *   0: 城市散点
 *   1: 跑者位置（占位，数据由 index.tsx 动态更新）
 *
 * 注意：geo 组件是唯一中国地图层，勿添加 series.type='map' 避免重影
 */
export function buildBaseMapOption(): EChartsOption {
  const coords = getCityCoords();

  // 响应式跑者大小
  const isWide = typeof window !== 'undefined' && window.innerWidth >= 768;
  const runnerFontSize = isWide ? 30 : 26;

  const scatterData = coords.map((c) => ({
    name: c.name,
    value: c.value,
    order: c.order,
    totalKm: c.totalKm,
    nextKm: c.nextKm,
    province: c.province,
    difficulty: c.difficulty,
    isStart: c.isStart,
    description: c.description,
  }));

  return {
    backgroundColor: 'transparent',

    // ===== Geo 组件（唯一中国地图层 + 坐标系） =====
    geo: {
      map: 'china',
      roam: true,
      scaleLimit: { min: 1, max: 8 },
      selectedMode: false,
      label: { show: true, fontSize: 8, color: 'rgba(255,255,255,0.4)' },
      itemStyle: {
        areaColor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
      },
      emphasis: { disabled: true },
      zlevel: 0,
      z: 1,
    },

    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as Record<string, unknown>;
        const data = p.data as Record<string, unknown> | undefined;
        if (!data) return '';
        const name = (data.name ?? p.name ?? '') as string;
        const runnerMode = data.mode as string | undefined;

        // 个人跑者 tooltip
        if (name === '🏃 我的位置' || name === '🏃 当前位置') {
          const fromCity = data.fromCity as string;
          const toCity = data.toCity as string;
          const ratio = data.ratio as number;
          const routeKm = data.routeKm as number;
          const description = data.description as string;
          const province = data.province as string;
          const roadName = data.roadName as string;
          const remainingKm = data.remainingKm as number;
          const totalKm = 21423;
          const pct = ((routeKm / totalKm) * 100).toFixed(1);

          return `
            <div style="font-size:13px;line-height:1.6;max-width:280px">
              <div style="font-size:16px;font-weight:bold;margin-bottom:4px">🏃 我的位置</div>
              <hr style="margin:4px 0;border-color:rgba(255,255,255,0.1)" />
              ${province ? `<div style="font-size:11px;color:#aaa;margin-top:2px">📍 ${province}</div>` : ''}
              <div style="font-size:12px;color:#ffd54f;margin-top:4px">从 ${fromCity} 前往 ${toCity}</div>
              ${roadName ? `<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">🛣️ ${roadName}</div>` : ''}
              <hr style="margin:6px 0;border-color:rgba(255,255,255,0.1)" />
              <div style="font-size:12px;margin-top:2px">
                <span style="color:#ffd54f">已完成 ${routeKm.toLocaleString()} km</span>
                <span style="color:rgba(255,255,255,0.4)">（${pct}%）</span>
              </div>
              ${remainingKm > 0 ? `<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">距 ${toCity} 还剩 ${remainingKm.toLocaleString()} km（需跑 ${(remainingKm / 10).toFixed(1)} km）</div>` : ''}
              <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px">路段进度 ${(ratio * 100).toFixed(0)}%</div>
              <hr style="margin:6px 0;border-color:rgba(255,255,255,0.1)" />
              <div style="font-size:11px;color:rgba(255,255,255,0.6);line-height:1.4">${description}</div>
            </div>
          `.trim();
        }

        // 全民跑者 tooltip
        if (name === '🏃 全民位置' || runnerMode === 'global') {
          const fromCity = (data.fromCity as string) || '';
          const toCity = (data.toCity as string) || '';
          const ratio = (data.ratio as number) || 0;
          const routeKm = (data.routeKm as number) || 0;
          const remainingKm = (data.remainingKm as number) || 0;
          const totalRunKm = (data.totalRunKm as number) || 0;
          const participants = (data.participants as number) || 0;
          const totalKm = 21423;
          const pct = ((routeKm / totalKm) * 100).toFixed(1);

          return `
            <div style="font-size:13px;line-height:1.6;max-width:280px">
              <div style="font-size:16px;font-weight:bold;margin-bottom:4px;color:#81c784">🌍 全民位置</div>
              <hr style="margin:4px 0;border-color:rgba(255,255,255,0.1)" />
              <div style="font-size:12px;color:#81c784;margin-top:4px">从 ${fromCity} 前往 ${toCity}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px">👥 ${participants} 人共同环游</div>
              <hr style="margin:6px 0;border-color:rgba(255,255,255,0.1)" />
              <div style="font-size:12px;margin-top:2px">
                <span style="color:#81c784">全民真实跑量 ${(totalRunKm / 10000).toFixed(1)}万 km</span>
              </div>
              <div style="font-size:12px;margin-top:2px">
                <span style="color:#a5d6a7">虚拟进度 ${routeKm.toLocaleString()} km</span>
                <span style="color:rgba(255,255,255,0.4)">（${pct}%）</span>
              </div>
              ${remainingKm > 0 ? `<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">距 ${toCity} 还剩 ${remainingKm.toLocaleString()} km（需跑 ${(remainingKm / 10).toFixed(1)} km）</div>` : ''}
              <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px">路段进度 ${(ratio * 100).toFixed(0)}%</div>
            </div>
          `.trim();
        }

        // 城市 tooltip（原有逻辑）
        const order = data.order as number;
        const province = data.province as string;
        const totalKm = data.totalKm as number;
        const nextKm = data.nextKm as number;
        const difficulty = data.difficulty as string;
        const description = data.description as string;
        const isStart = data.isStart as boolean;
        return `
          <div style="font-size:13px;line-height:1.6;max-width:260px">
            <div style="font-size:15px;font-weight:bold;margin-bottom:4px">
              ${isStart ? '🏁 ' : ''}${name}
              <span style="font-weight:normal;font-size:11px;color:#999;margin-left:6px">#${order}</span>
            </div>
            <div style="font-size:12px;color:#aaa">${province}</div>
            <hr style="margin:6px 0;border-color:rgba(255,255,255,0.1)" />
            <div style="font-size:12px"><span style="color:#4fc3f7">累计 ${totalKm.toLocaleString()} km</span></div>
            <div style="font-size:12px;margin-top:2px"><span style="color:rgba(255,255,255,0.5)">下一站 ${nextKm.toLocaleString()} km →</span></div>
            <hr style="margin:6px 0;border-color:rgba(255,255,255,0.1)" />
            <div style="font-size:11px;color:rgba(255,255,255,0.7)">难度：${difficulty}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">${description}</div>
          </div>
        `.trim();
      },
      extraCssText:
        'background:rgba(15,32,39,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:8px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.4);backdrop-filter:blur(8px);',
    },

    series: [
      // 0. 城市散点
      {
        name: '城市',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: (_val: unknown, params: unknown) => {
          const p = params as Record<string, unknown>;
          const d = p.data as Record<string, unknown>;
          return d?.isStart ? 14 : 8;
        },
        label: {
          show: true,
          formatter: (params: unknown) => {
            const p = params as Record<string, unknown>;
            const d = p.data as Record<string, unknown>;
            if (!d) return '';
            return `${d.order as number}.${d.name as string}`;
          },
          fontSize: 9,
          color: 'rgba(255,255,255,0.85)',
          position: 'right',
          distance: 4,
        },
        itemStyle: {
          color: (params: unknown) => {
            const p = params as Record<string, unknown>;
            const d = p.data as Record<string, unknown>;
            return d?.isStart ? '#ffd54f' : '#4fc3f7';
          },
          borderColor: '#fff',
          borderWidth: 1,
        },
        emphasis: {
          label: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
          itemStyle: { borderWidth: 2, shadowBlur: 10, shadowColor: 'rgba(79,195,247,0.5)' },
        },
        zlevel: 1, z: 3,
      },

      // 1. 跑者位置（占位，数据由 index.tsx 动态更新）
      {
        name: '当前位置',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: [{ name: '🏃 当前位置', value: [114.07, 22.54] }],
        symbol: 'circle',
        symbolSize: 0.01,
        label: {
          show: true,
          formatter: '🏃',
          fontSize: runnerFontSize + 10,
          position: 'inside',
          color: '#fff',
          textShadowBlur: 10,
          textShadowColor: 'rgba(0,0,0,0.6)',
        },
        emphasis: {
          label: { fontSize: runnerFontSize + 14 },
        },
        zlevel: 2, z: 10,
      },
    ],
  };
}

/**
 * 根据进度构建路线系列
 */
export function buildRouteLineSeries(virtualKm: number): object[] {
  const { completedCoords, uncompletedCoords } = splitRouteByProgress(virtualKm);

  const series: object[] = [];
  const hasCompleted = completedCoords.length > 1;
  const hasUncompleted = uncompletedCoords.length > 1;

  // 已完成路线 - 光晕
  if (hasCompleted) {
    series.push({
      name: '已完成路线光晕', type: 'lines', coordinateSystem: 'geo',
      polyline: true,
      lineStyle: { color: '#ffd54f', width: 8, opacity: 0.2, curveness: 0 },
      data: [{ coords: completedCoords }], zlevel: 1, z: 1.5,
    });
  }

  // 已完成路线 - 主线
  if (hasCompleted) {
    series.push({
      name: '已完成路线', type: 'lines', coordinateSystem: 'geo',
      polyline: true,
      lineStyle: { color: '#ffd54f', width: 3, opacity: 0.9, curveness: 0 },
      effect: { show: true, period: 6, trailLength: 0.15, symbol: 'circle', symbolSize: 5, color: '#ffe082' },
      data: [{ coords: completedCoords }], zlevel: 1, z: 2.5,
    });
  }

  // 未完成路线 - 光晕
  if (hasUncompleted) {
    series.push({
      name: '未完成路线光晕', type: 'lines', coordinateSystem: 'geo',
      polyline: true,
      lineStyle: { color: '#4fc3f7', width: 6, opacity: 0.12, curveness: 0 },
      data: [{ coords: uncompletedCoords }], zlevel: 1, z: 1,
    });
  }

  // 未完成路线 - 主线
  if (hasUncompleted) {
    series.push({
      name: '未完成路线', type: 'lines', coordinateSystem: 'geo',
      polyline: true,
      lineStyle: { color: '#4fc3f7', width: 2, opacity: 0.5, curveness: 0 },
      effect: { show: true, period: 8, trailLength: 0.1, symbol: 'circle', symbolSize: 4, color: '#81d4fa' },
      data: [{ coords: uncompletedCoords }], zlevel: 1, z: 2,
    });
  }

  return series;
}
