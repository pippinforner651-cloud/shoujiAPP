import L, { type Circle, type CircleMarker, type Map, type Polyline } from 'leaflet';
import type { RunTrackPoint } from '../run/runSession';
import type { RunMapAdapter, RunMapCallbacks } from './types';

export class LeafletRunMapAdapter implements RunMapAdapter {
  private map: Map | null = null;
  private marker: CircleMarker | null = null;
  private accuracy: Circle | null = null;
  private trackLine: Polyline | null = null;
  private follow = true;
  private resizeTimer: number | null = null;
  private tileErrorReported = false;
  private fallbackAttempted = false;

  mount(container: HTMLElement, callbacks: RunMapCallbacks) {
    this.map = L.map(container, { zoomControl: false, attributionControl: true }).setView([22.6, 113.97], 15);
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const fallbackUrl = 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png';
    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    tiles.on('tileerror', () => {
      if (!this.tileErrorReported) {
        this.tileErrorReported = true;
        callbacks.onError('地图瓦片加载失败，已切换备用源');
        if (!this.fallbackAttempted && this.map) {
          this.fallbackAttempted = true;
          const fallback = L.tileLayer(fallbackUrl, {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          });
          fallback.addTo(this.map);
        }
      }
    });
    tiles.addTo(this.map);
    this.map.on('dragstart zoomstart', () => callbacks.onUserInteraction());
    window.requestAnimationFrame(() => this.map?.invalidateSize(false));
    this.resizeTimer = window.setTimeout(() => this.map?.invalidateSize(false), 250);
  }

  setCurrentPosition(point: RunTrackPoint | null, accuracyM: number | null) {
    if (!this.map || !point) return;
    const latLng = L.latLng(point.lat, point.lon);
    if (!this.marker) this.marker = L.circleMarker(latLng, { radius: 7, color: '#fff', weight: 3, fillColor: '#f28c22', fillOpacity: 1 }).addTo(this.map);
    else this.marker.setLatLng(latLng);
    if (!this.accuracy) this.accuracy = L.circle(latLng, { radius: accuracyM ?? 0, color: '#0d2b45', weight: 1, fillOpacity: 0.08 }).addTo(this.map);
    else this.accuracy.setLatLng(latLng).setRadius(accuracyM ?? 0);
    if (this.follow) this.map.panTo(latLng, { animate: true });
  }

  setTrack(points: RunTrackPoint[]) {
    if (!this.map) return;
    const coords = points.map((point) => L.latLng(point.lat, point.lon));
    if (!this.trackLine) this.trackLine = L.polyline(coords, { color: '#f28c22', weight: 5, opacity: 0.95 }).addTo(this.map);
    else this.trackLine.setLatLngs(coords);
  }

  fitTrack() {
    if (this.map && this.trackLine && this.trackLine.getLatLngs().length > 1) this.map.fitBounds(this.trackLine.getBounds(), { padding: [24, 24] });
  }
  setFollow(enabled: boolean) { this.follow = enabled; }
  destroy() {
    if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
    this.resizeTimer = null;
    this.map?.remove();
    this.map = null;
  }
}

export const createLeafletRunMap = (): RunMapAdapter => new LeafletRunMapAdapter();
