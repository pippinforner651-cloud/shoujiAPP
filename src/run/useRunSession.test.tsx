import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRunSession } from './useRunSession';

const point = { lat: 22.6, lon: 113.97, accuracyM: 8, timestamp: 1, accepted: true, provider: 'gps', rejectionReason: null, calculatedSpeedMps: 2, distanceDeltaM: 3, riskFlag: null, mock: false };

function client(overrides = {}) {
  return {
    addLocationListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    addStatsListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    recoverActiveRun: vi.fn().mockResolvedValue({}),
    loadFullTrack: vi.fn().mockResolvedValue([]),
    checkOutdoorReadiness: vi.fn(), prepareOutdoorRun: vi.fn(), cancelPreparation: vi.fn(),
    startRun: vi.fn(), pauseRun: vi.fn(), resumeRun: vi.fn(), stopRun: vi.fn(), abandonRun: vi.fn(),
    ...overrides,
  };
}

describe('useRunSession', () => {
  it('hydrates a recovered run from SQLite points', async () => {
    const api = client({
      recoverActiveRun: vi.fn().mockResolvedValue({ activeRun: true, clientActivityId: 'run-1', startTimeMs: 10, totalDistanceM: 120 }),
      loadFullTrack: vi.fn().mockResolvedValue([point]),
    });
    const { result } = renderHook(() => useRunSession(api));
    await waitFor(() => expect(result.current.state.phase).toBe('recovery'));
    expect(result.current.state.activityId).toBe('run-1');
    expect(result.current.state.geoTrail).toEqual([point]);
  });

  it('starts once and finishes from authoritative SQLite points', async () => {
    const api = client({ startRun: vi.fn().mockResolvedValue({ clientActivityId: 'run-2', startTimeMs: 20 }), loadFullTrack: vi.fn().mockResolvedValue([point]) });
    const { result } = renderHook(() => useRunSession(api));
    await act(() => result.current.start());
    await act(() => result.current.start());
    expect(api.startRun).toHaveBeenCalledOnce();
    await act(() => result.current.finish());
    expect(result.current.state.geoTrail).toEqual([point]);
    expect(result.current.state.uploadedTrackPointCount).toBe(1);
  });
});
