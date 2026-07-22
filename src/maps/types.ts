import type { RunTrackPoint } from '../run/runSession';

export interface RunMapCallbacks {
  onUserInteraction(): void;
  onError(message: string): void;
}

export interface RunMapAdapter {
  mount(container: HTMLElement, callbacks: RunMapCallbacks): void;
  setCurrentPosition(point: RunTrackPoint | null, accuracyM: number | null): void;
  setTrack(points: RunTrackPoint[]): void;
  fitTrack(): void;
  setFollow(enabled: boolean): void;
  destroy(): void;
}
