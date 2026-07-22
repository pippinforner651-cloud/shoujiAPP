import { describe, expect, it, vi } from 'vitest';
import { NativeRunClient } from './nativeRunClient';

describe('NativeRunClient', () => {
  it('pages the complete SQLite track and maps audit fields', async () => {
    const plugin = {
      loadActivityTrackPoints: vi.fn()
        .mockResolvedValueOnce({ points: JSON.stringify([{ lat: 22.6, lon: 113.97, accuracy: 8, ts: 1, accepted: true, provider: 'gps', calculatedSpeed: 2, distanceDelta: 3, riskFlag: '' }]), total: 1 })
        .mockResolvedValueOnce({ points: '[]', total: 0 }),
    };
    const client = new NativeRunClient(plugin as never, 1);
    const points = await client.loadFullTrack('run-1');
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ accuracyM: 8, provider: 'gps', distanceDeltaM: 3 });
    expect(plugin.loadActivityTrackPoints).toHaveBeenCalledTimes(2);
  });

  it('uses typed native listeners and removes them', async () => {
    const remove = vi.fn();
    const plugin = { addListener: vi.fn().mockResolvedValue({ remove }) };
    const client = new NativeRunClient(plugin as never);
    const handle = await client.addLocationListener(vi.fn());
    await handle.remove();
    expect(plugin.addListener).toHaveBeenCalledWith('locationUpdate', expect.any(Function));
    expect(remove).toHaveBeenCalledOnce();
  });
});
