import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RunMap } from './RunMap';
import type { RunMapAdapter } from '../maps/types';

const point = { lat: 22.6, lon: 113.97, accuracyM: 8, timestamp: 1, accepted: true, provider: 'gps', rejectionReason: null, calculatedSpeedMps: 2, distanceDeltaM: 3, riskFlag: null, mock: false };

function adapter(): RunMapAdapter {
  return { mount: vi.fn(), setCurrentPosition: vi.fn(), setTrack: vi.fn(), fitTrack: vi.fn(), setFollow: vi.fn(), destroy: vi.fn() };
}

describe('RunMap', () => {
  it('sends accepted trail to the adapter and reports rendered points', () => {
    const map = adapter(); const rendered = vi.fn();
    render(<RunMap mode="running" currentPoint={point} track={[point]} accuracyM={8} follow onFollowChange={vi.fn()} onRenderedPointCount={rendered} adapterFactory={() => map} />);
    expect(map.setTrack).toHaveBeenCalledWith([point]);
    expect(rendered).toHaveBeenCalledWith(1);
  });

  it('shows a non-blocking error while GPS continues', () => {
    const map = adapter();
    (map.mount as ReturnType<typeof vi.fn>).mockImplementation((_el, callbacks) => callbacks.onError('地图暂时无法加载，GPS仍在记录'));
    render(<RunMap mode="running" currentPoint={point} track={[]} accuracyM={8} follow onFollowChange={vi.fn()} onRenderedPointCount={vi.fn()} adapterFactory={() => map} />);
    expect(screen.getByText('地图暂时无法加载，GPS仍在记录')).toBeInTheDocument();
  });

  it('restores follow mode from the visible button', () => {
    const map = adapter(); const change = vi.fn();
    render(<RunMap mode="running" currentPoint={point} track={[]} accuracyM={8} follow={false} onFollowChange={change} onRenderedPointCount={vi.fn()} adapterFactory={() => map} />);
    fireEvent.click(screen.getByRole('button', { name: '重新定位' }));
    expect(change).toHaveBeenCalledWith(true);
  });
});
