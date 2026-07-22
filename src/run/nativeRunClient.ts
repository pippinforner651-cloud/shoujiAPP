import type { PluginListenerHandle } from '@capacitor/core';
import GpsRun, { type GpsRunPlugin, type TrackPointResponse } from '../providers/nativeGpsPlugin';
import type { RunTrackPoint } from './runSession';

export class NativeRunClient {
  private readonly plugin: GpsRunPlugin;
  private readonly pageSize: number;

  constructor(plugin: GpsRunPlugin = GpsRun, pageSize = 500) {
    this.plugin = plugin;
    this.pageSize = pageSize;
  }

  checkOutdoorReadiness() { return this.plugin.checkOutdoorReadiness(); }
  prepareOutdoorRun() { return this.plugin.prepareOutdoorRun(); }
  cancelPreparation() { return this.plugin.cancelPreparation(); }
  startRun() { return this.plugin.startRun(); }
  pauseRun() { return this.plugin.pauseRun(); }
  resumeRun() { return this.plugin.resumeRun(); }
  stopRun() { return this.plugin.stopRun(); }
  abandonRun() { return this.plugin.abandonRun(); }
  recoverActiveRun() { return this.plugin.recoverActiveRun(); }

  addLocationListener(listener: (point: RunTrackPoint) => void): Promise<PluginListenerHandle> {
    return this.plugin.addListener('locationUpdate', (point) => listener(mapTrackPoint(point)));
  }

  addStatsListener(listener: (stats: { distanceM: number; durationSec: number; acceptedPointCount: number; rejectedPointCount: number }) => void): Promise<PluginListenerHandle> {
    return this.plugin.addListener('statsUpdate', (stats) => listener({
      distanceM: stats.distanceM,
      durationSec: stats.durationMs / 1000,
      acceptedPointCount: stats.gpsPoints,
      rejectedPointCount: stats.rejectedPoints ?? stats.rejectedPts,
    }));
  }

  async loadFullTrack(activityId: string): Promise<RunTrackPoint[]> {
    const all: RunTrackPoint[] = [];
    for (let offset = 0; ; offset += this.pageSize) {
      const response = await this.plugin.loadActivityTrackPoints({ activityId, limit: this.pageSize, offset });
      const raw = JSON.parse(response.points) as TrackPointResponse[];
      all.push(...raw.map(mapTrackPoint));
      if (raw.length < this.pageSize) break;
    }
    return all;
  }
}

export function mapTrackPoint(point: TrackPointResponse): RunTrackPoint {
  return {
    lat: point.lat,
    lon: point.lon,
    accuracyM: Number.isFinite(point.accuracy) ? point.accuracy : null,
    timestamp: point.timestamp ?? (point as unknown as { ts: number }).ts,
    accepted: point.accepted,
    provider: point.provider || '',
    rejectionReason: point.rejectionReason || null,
    calculatedSpeedMps: point.calculatedSpeed || 0,
    distanceDeltaM: point.distanceDelta || 0,
    riskFlag: point.riskFlag || null,
    mock: point.mock || false,
  };
}

export const nativeRunClient = new NativeRunClient();
