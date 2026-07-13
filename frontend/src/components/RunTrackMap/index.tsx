import { useEffect, useRef, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { ScatterChart, LinesChart } from 'echarts/charts';
import { GeoComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import type { GpsPoint } from '../../types/gps';

echarts.use([ScatterChart, LinesChart, GeoComponent, TooltipComponent, CanvasRenderer]);

interface Props {
  gpsTrack: GpsPoint[];
  height?: string;
}

/** 简易本地地图（显示 GPS 轨迹，无中国省界） */
export default function RunTrackMap({ gpsTrack, height = '180px' }: Props) {
  const chartRef = useRef<ReactEChartsCore>(null);
  const [option, setOption] = useState<EChartsOption | null>(null);

  useEffect(() => {
    if (!gpsTrack || gpsTrack.length < 2) return;

    const coords = gpsTrack.map((p) => [p.longitude, p.latitude] as [number, number]);

    // 计算边界框
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const minLng = Math.min(...lngs) - 0.005;
    const maxLng = Math.max(...lngs) + 0.005;
    const minLat = Math.min(...lats) - 0.005;
    const maxLat = Math.max(...lats) + 0.005;

    const opt: EChartsOption = {
      backgroundColor: 'transparent',
      grid: { show: false },
      xAxis: { show: false, min: minLng, max: maxLng },
      yAxis: { show: false, min: minLat, max: maxLat },
      series: [
        // 轨迹线
        {
          type: 'lines',
          coordinateSystem: 'cartesian2d',
          polyline: true,
          lineStyle: { color: '#4fc3f7', width: 3, opacity: 0.8 },
          data: [{ coords }],
          z: 2,
        },
        // 起点
        {
          type: 'scatter',
          coordinateSystem: 'cartesian2d',
          data: [{ value: coords[0], name: '起点' }],
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { color: '#81c784' },
          label: { show: true, formatter: '🏁', fontSize: 14, position: 'top' },
          z: 3,
        },
        // 终点
        {
          type: 'scatter',
          coordinateSystem: 'cartesian2d',
          data: [{ value: coords[coords.length - 1], name: '终点' }],
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { color: '#ff5252' },
          label: { show: true, formatter: '🏃', fontSize: 14, position: 'top' },
          z: 3,
        },
      ],
    };

    setOption(opt);
  }, [gpsTrack]);

  if (!gpsTrack || gpsTrack.length < 2) {
    return <div className="trackmap-empty">暂无 GPS 轨迹数据</div>;
  }

  return (
    <div className="trackmap">
      <ReactEChartsCore
        ref={chartRef}
        echarts={echarts}
        option={option!}
        style={{ height, width: '100%' }}
        notMerge
        lazyUpdate
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
