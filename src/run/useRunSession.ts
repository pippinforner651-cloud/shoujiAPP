import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { nativeRunClient, type NativeRunClient } from './nativeRunClient';
import { createInitialRunSession, runSessionReducer } from './runSession';
import type { DiagnosticsResponse } from '../providers/nativeGpsPlugin';

type RunClient = Pick<NativeRunClient,
  'addLocationListener' | 'addStatsListener' | 'recoverActiveRun' | 'loadFullTrack' |
  'checkOutdoorReadiness' | 'prepareOutdoorRun' | 'cancelPreparation' | 'startRun' |
  'pauseRun' | 'resumeRun' | 'stopRun' | 'abandonRun' | 'getDiagnostics' |
  'openAppLocationSettings' | 'openSystemLocationSettings'>;

export function useRunSession(client: RunClient = nativeRunClient, enabled = true) {
  const [state, dispatch] = useReducer(runSessionReducer, undefined, createInitialRunSession);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);
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

  const refreshDiagnostics = useCallback(async () => {
    if (!enabled) return null;
    try {
      const next = await client.getDiagnostics();
      setDiagnostics(next);
      return next;
    } catch {
      return null;
    }
  }, [client, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const initial = window.setTimeout(() => { void refreshDiagnostics(); }, 0);
    const timer = window.setInterval(() => { void refreshDiagnostics(); }, 1_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [enabled, refreshDiagnostics]);

  useEffect(() => {
    if (!enabled) return;
    const hydrateVisibleRun = async () => {
      if (document.visibilityState !== 'visible') return;
      const snapshot = stateRef.current;
      if (!snapshot.activityId) {
        await refreshDiagnostics();
        return;
      }
      const [points, diag] = await Promise.all([
        client.loadFullTrack(snapshot.activityId),
        refreshDiagnostics(),
      ]);
      dispatch({ type: 'TRACK_HYDRATED', points });
      if (diag) dispatch({
        type: 'STATS',
        distanceM: diag.totalDistanceM ?? snapshot.distanceM,
        durationSec: snapshot.durationSec,
        acceptedPointCount: diag.validPoints,
        rejectedPointCount: diag.rejectedPoints,
      });
    };
    document.addEventListener('visibilitychange', hydrateVisibleRun);
    return () => document.removeEventListener('visibilitychange', hydrateVisibleRun);
  }, [client, enabled, refreshDiagnostics]);

  const prepareOutdoor = useCallback(async () => {
    const ready = await client.checkOutdoorReadiness();
    if (!ready.ready) return ready;
    await client.prepareOutdoorRun();
    dispatch({ type: 'PREPARING' });
    return ready;
  }, [client]);

  const start = useCallback(async () => {
    if (stateRef.current.activityId) return stateRef.current.activityId;
    const diag = await client.getDiagnostics();
    setDiagnostics(diag);
    if (!diag.serviceRunning || !diag.locationRequestSucceeded || (diag.gpsCallbackCount ?? 0) <= 0) {
      throw new Error('GPS尚未收到真实回调，不能开始跑步');
    }
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

  return {
    state,
    diagnostics,
    dispatch,
    refreshDiagnostics,
    prepareOutdoor,
    cancelPreparation,
    start,
    pause,
    resume,
    finish,
    abandon,
    openAppLocationSettings: client.openAppLocationSettings.bind(client),
    openSystemLocationSettings: client.openSystemLocationSettings.bind(client),
  };
}
