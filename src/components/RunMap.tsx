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
    map.mount(container.current, { onUserInteraction: () => onFollowChange(false), onError: setError });
    return () => { map.destroy(); adapter.current = null; };
  }, [adapterFactory, onFollowChange]);

  useEffect(() => { adapter.current?.setCurrentPosition(currentPoint, accuracyM); }, [currentPoint, accuracyM]);
  useEffect(() => { adapter.current?.setTrack(track); onRenderedPointCount(track.length); }, [track, onRenderedPointCount]);
  useEffect(() => { adapter.current?.setFollow(follow); }, [follow]);
  useEffect(() => { if (mode === 'post') adapter.current?.fitTrack(); }, [mode, track]);

  return <div className="run-map-shell">
    <div ref={container} className="run-map-canvas" aria-label="跑步实时地图" />
    {error && <div className="run-map-error">{error}</div>}
    {!follow && <button type="button" className="run-map-follow" onClick={() => onFollowChange(true)}>重新定位</button>}
  </div>;
}
