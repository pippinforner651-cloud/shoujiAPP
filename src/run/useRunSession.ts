import { useCallback, useEffect, useReducer, useRef } from 'react';
import { nativeRunClient, type NativeRunClient } from './nativeRunClient';
import { createInitialRunSession, runSessionReducer } from './runSession';

type RunClient = Pick<NativeRunClient,
  'addLocationListener' | 'addStatsListener' | 'recoverActiveRun' | 'loadFullTrack' |
  'checkOutdoorReadiness' | 'prepareOutdoorRun' | 'cancelPreparation' | 'startRun' |
  'pauseRun' | 'resumeRun' | 'stopRun' | 'abandonRun'>;

export function useRunSession(client: RunClient = nativeRunClient, enabled = true) {
  const [state, dispatch] = useReducer(runSessionReducer, undefined, createInitialRunSession);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];
    void client.addLocationListener((point) => dispatch({ type: 'LOCATION', point })).then((handle) => {
      if (disposed) void handle.remove(); else handles.push(handle);
    });
    void client.addStatsListener((stats) => dispatch({ type: 'STATS', ...stats })).then((handle) => {
      if (disposed) void handle.remove(); else handles.push(handle);
    });
    void client.recoverActiveRun().then(async (active) => {
      if (disposed || !active.activeRun || !active.clientActivityId) return;
      const points = await client.loadFullTrack(active.clientActivityId);
      if (!disposed) dispatch({ type: 'RECOVERED', activityId: active.clientActivityId, startTimeMs: active.startTimeMs ?? 0, distanceM: active.totalDistanceM ?? 0, durationSec: 0, points });
    });
    return () => { disposed = true; void Promise.all(handles.map((handle) => handle.remove())); };
  }, [client, enabled]);

  const prepareOutdoor = useCallback(async () => {
    const ready = await client.checkOutdoorReadiness();
    if (!ready.ready) return ready;
    await client.prepareOutdoorRun();
    dispatch({ type: 'PREPARING' });
    return ready;
  }, [client]);

  const start = useCallback(async () => {
    if (stateRef.current.activityId) return stateRef.current.activityId;
    const started = await client.startRun();
    dispatch({ type: 'STARTED', activityId: started.clientActivityId, startTimeMs: started.startTimeMs });
    return started.clientActivityId;
  }, [client]);

  const pause = useCallback(async () => { await client.pauseRun(); dispatch({ type: 'PAUSED' }); }, [client]);
  const resume = useCallback(async () => { await client.resumeRun(); dispatch({ type: 'RESUMED' }); }, [client]);
  const cancelPreparation = useCallback(async () => { await client.cancelPreparation(); dispatch({ type: 'RESET' }); }, [client]);
  const finish = useCallback(async () => {
    const snapshot = stateRef.current;
    const activityId = snapshot.activityId;
    await client.stopRun();
    let points = snapshot.allTrackPoints;
    if (activityId) {
      points = await client.loadFullTrack(activityId);
      dispatch({ type: 'TRACK_HYDRATED', points });
      dispatch({ type: 'UPLOADED', pointCount: points.filter((point) => point.accepted && point.provider === 'gps').length });
    }
    dispatch({ type: 'DONE' });
    return { snapshot, points };
  }, [client]);
  const abandon = useCallback(async () => { await client.abandonRun(); dispatch({ type: 'RESET' }); }, [client]);

  return { state, dispatch, prepareOutdoor, cancelPreparation, start, pause, resume, finish, abandon };
}
