import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { createLeafletRunMap } from '../maps/leafletMap';
import type { RunMapAdapter } from '../maps/types';
import type { RunTrackPoint } from '../run/runSession';

interface Props {
  mode: 'pre' | 'running' | 'post';
  currentPoint: RunTrackPoint | null;
  track: RunTrackPoint[];
  accuracyM: number | null;
  follow: boolean;
  onFollowChange(value: boolean): void;
  onRenderedPointCount(count: number): void;
  adapterFactory?: () => RunMapAdapter;
}

export function RunMap({ mode, currentPoint, track, accuracyM, follow, onFollowChange, onRenderedPointCount, adapterFactory = createLeafletRunMap }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const adapter = useRef<RunMapAdapter | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!container.current) return;
    const map = adapterFactory();
    adapter.current = map;
    let alive = true;
    const reportError = (message: string) => window.queueMicrotask(() => { if (alive) setError(message); });
    try {
      map.mount(container.current, { onUserInteraction: () => onFollowChange(false), onError: reportError });
    } catch (cause) {
      reportError(`地图初始化失败，GPS仍在记录：${cause instanceof Error ? cause.message : '未知错误'}`);
    }
    return () => { alive = false; map.destroy(); adapter.current = null; };
  }, [adapterFactory, onFollowChange]);

  useEffect(() => { adapter.current?.setCurrentPosition(currentPoint, accuracyM); }, [currentPoint, accuracyM]);
  useEffect(() => { adapter.current?.setTrack(track); onRenderedPointCount(track.length); }, [track, onRenderedPointCount]);
  useEffect(() => { adapter.current?.setFollow(follow); }, [follow]);
  useEffect(() => { if (mode === 'post') adapter.current?.fitTrack(); }, [mode, track]);

  return <div className="run-map-shell">
    <div ref={container} className="run-map-canvas" aria-label="跑步实时地图" />
    {error && <div className="run-map-error">{error}</div>}
    <div className="run-map-coordinate">{currentPoint
      ? `${currentPoint.lat.toFixed(6)}, ${currentPoint.lon.toFixed(6)}`
      : '等待GPS · 默认深圳'}</div>
    {!follow && <button type="button" className="run-map-follow" onClick={() => onFollowChange(true)}>重新定位</button>}
  </div>;
}
