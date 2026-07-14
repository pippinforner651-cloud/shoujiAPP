import { useCallback, useEffect, useRef, useState } from 'react';
import E23Icon from '../E23Icon';
import RunTrackMap from '../RunTrackMap';
import ManualRunEntry from './ManualRunEntry';
import RunSummary from './RunSummary';
import { checkGpsPermission, requestGpsPermission } from './gpsUtils';
import { createEmptySession, estimateCalories, formatPace, formatTime, haversineKm, type RunSessionData } from './runState';
import { useCityStore } from '../../store/cityStore';
import { useRunStore } from '../../store/runStore';
import type { RunRecord } from '../../types/run';
import { calculateRouteProgress } from '../../utils/routeProgress';
import { buildRunSummary, type CompletedRunSummary, type ManualRunInput, type RouteSnapshot } from '../../utils/runFlow';
import { buildHomeJourney } from '../../utils/homeJourney';
import { filterUnseenMilestones, findNewMilestones, MILESTONE_STORAGE_KEY, type CoreMilestone } from '../../utils/milestoneFeedback';

interface Props { onBackHome?: () => void; onViewMap?: () => void; }
interface CompletedRun { record: RunRecord; summary: CompletedRunSummary; routeAfter: RouteSnapshot; milestones: CoreMilestone[]; }

function routeSnapshot(actualKm: number): RouteSnapshot {
  const progress = calculateRouteProgress(actualKm);
  return {
    currentCity: progress.currentCity ?? '深圳',
    nextCity: progress.nextCity,
    remainingToNextKm: progress.distanceToNextCityKm,
    completionRate: progress.progressPercent,
  };
}

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function RunSession({ onBackHome = () => undefined, onViewMap = () => undefined }: Props) {
  const [mode, setMode] = useState<'manual' | 'gps'>('manual');
  const [gpsGranted, setGpsGranted] = useState<boolean | null>(null);
  const [session, setSession] = useState<RunSessionData>(createEmptySession());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [completed, setCompleted] = useState<CompletedRun | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const addRecord = useRunStore((state) => state.addRecord);
  const checkAndUnlock = useCityStore((state) => state.checkAndUnlock);

  useEffect(() => {
    checkGpsPermission().then((state) => setGpsGranted(state === 'granted' ? true : state === 'denied' ? false : null));
  }, []);

  const stopGps = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => () => { stopGps(); stopTimer(); }, [stopGps, stopTimer]);

  const persistRun = useCallback((input: ManualRunInput, gpsTrack: RunSessionData['points'] = []) => {
    setSaving(true);
    setErrorMsg('');
    try {
      const beforeRunState = useRunStore.getState();
      const beforeActualKm = beforeRunState.stats.totalDistanceKm;
      const beforeHome = buildHomeJourney(beforeRunState.records);
      const beforeCityCount = useCityStore.getState().unlockedCities.length;
      const before = routeSnapshot(beforeActualKm);
      const source = gpsTrack.length > 0 ? 'app_gps' : 'manual';
      const record = addRecord(input.date, input.distanceKm, input.durationMin, input.note, gpsTrack, {
        durationSec: Math.round(input.durationMin * 60),
        calories: estimateCalories(input.distanceKm),
        source,
        sportType: input.sportType ?? 'running',
        verificationStatus: source === 'app_gps' ? 'verified_device' : 'manual_unverified',
        deviceName: source === 'app_gps' ? navigator.platform || '本机' : undefined,
        synced: false,
      });
      const afterActualKm = beforeActualKm + record.distanceKm;
      const after = routeSnapshot(afterActualKm);
      const newCities = checkAndUnlock(afterActualKm);
      const afterHome = buildHomeJourney([...beforeRunState.records, record]);
      const crossed = findNewMilestones(
        { totalKm: beforeActualKm, streakDays: beforeHome.streakDays, unlockedCityCount: beforeCityCount },
        { totalKm: afterActualKm, streakDays: afterHome.streakDays, unlockedCityCount: beforeCityCount + newCities.length },
      );
      let seenIds: string[] = [];
      try { seenIds = JSON.parse(localStorage.getItem(MILESTONE_STORAGE_KEY) || '[]') as string[]; } catch { seenIds = []; }
      const milestones = filterUnseenMilestones(crossed, seenIds);
      if (milestones.length > 0) {
        localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify([...new Set([...seenIds, ...milestones.map((item) => item.id)])]));
      }
      setCompleted({ record, summary: buildRunSummary(record, before, after), routeAfter: after, milestones });
    } catch (error) {
      setErrorMsg(`保存失败：${String(error)}`);
    } finally {
      setSaving(false);
    }
  }, [addRecord, checkAndUnlock]);

  const startGps = useCallback(() => {
    if (watchIdRef.current !== null || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition((position) => {
      setSession((previous) => {
        const points = [...previous.points, {
          latitude: position.coords.latitude, longitude: position.coords.longitude,
          timestamp: new Date(position.timestamp).toISOString(), speed: position.coords.speed ?? undefined,
          altitude: position.coords.altitude ?? undefined,
        }];
        let distanceKm = previous.distanceKm;
        if (points.length >= 2) {
          const prior = points[points.length - 2];
          distanceKm += haversineKm(prior.latitude, prior.longitude, position.coords.latitude, position.coords.longitude);
        }
        const durationSec = (Date.now() - startTimeRef.current) / 1000;
        return { ...previous, state: 'RUNNING', points, distanceKm: Math.round(distanceKm * 1000) / 1000,
          paceSec: distanceKm > .01 ? Math.round(durationSec / distanceKm) : 0 };
      });
    }, (error) => setErrorMsg(`GPS定位暂不可用：${error.message}`), { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 });
  }, []);

  const startTimer = (elapsedSeconds = 0) => {
    startTimeRef.current = Date.now() - elapsedSeconds * 1000;
    timerRef.current = setInterval(() => setSession((previous) => previous.state === 'RUNNING'
      ? { ...previous, durationSec: Math.round((Date.now() - startTimeRef.current) / 1000), calories: estimateCalories(previous.distanceKm) }
      : previous), 1000);
  };

  const handleStart = () => {
    setSession({ ...createEmptySession(), state: 'RUNNING' });
    setErrorMsg('');
    startTimer(0);
    startGps();
  };
  const handlePause = () => { stopGps(); stopTimer(); setSession((previous) => ({ ...previous, state: 'PAUSED' })); };
  const handleResume = () => { startTimer(session.durationSec); startGps(); setSession((previous) => ({ ...previous, state: 'RUNNING' })); };
  const handleFinish = () => {
    stopGps(); stopTimer();
    if (session.distanceKm < .1 || session.durationSec < 60) return setErrorMsg('GPS记录至少需要0.1公里和1分钟才能保存。');
    setSession((previous) => ({ ...previous, state: 'FINISHED' }));
    persistRun({ distanceKm: session.distanceKm, durationMin: session.durationSec / 60, date: localToday(), sportType: 'running', note: '本机GPS记录' }, session.points);
  };
  const reset = () => { setCompleted(null); setSession(createEmptySession()); setErrorMsg(''); };

  if (completed) return <RunSummary {...completed} onReset={reset} onBackHome={onBackHome} onViewMap={onViewMap} />;

  const isIdle = session.state === 'IDLE';
  const isRunning = session.state === 'RUNNING';
  const isPaused = session.state === 'PAUSED';

  return (
    <div className="run-session-v1">
      <header className="run-mode-header"><div><p className="section-kicker">记录一次真实运动</p><h1>跑完以后，旅程继续</h1></div>
        <div className="run-mode-switch"><button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>手动录入</button><button className={mode === 'gps' ? 'active' : ''} onClick={() => setMode('gps')}>GPS记录</button></div>
      </header>

      {mode === 'manual' ? <ManualRunEntry onSave={(input) => persistRun(input)} saving={saving} /> : (
        <section className="gps-run-card">
          {gpsGranted !== true ? <div className="gps-permission-card"><div className="gps-permission-icon"><E23Icon name="route" size={30} /></div><h2>{gpsGranted === false ? '定位权限尚未开启' : '使用GPS记录真实轨迹'}</h2><p>授权后会在本机记录距离、时长和轨迹。GPS能力仍需真机验证。</p><button className="primary-action" onClick={async () => setGpsGranted(await requestGpsPermission())}>{gpsGranted === false ? '重新请求定位' : '允许定位并继续'}</button></div> : <>
            <div className="gps-live-display"><span>{isIdle ? '准备出发' : isPaused ? '已暂停' : '记录中'}</span><strong>{formatTime(session.durationSec)}</strong><p>{session.distanceKm.toFixed(2)} km · {formatPace(session.paceSec)}</p></div>
            <div className="gps-live-grid"><div><span>距离</span><strong>{session.distanceKm.toFixed(2)} km</strong></div><div><span>配速</span><strong>{formatPace(session.paceSec)}</strong></div><div><span>轨迹点</span><strong>{session.points.length}</strong></div></div>
            {(isRunning || isPaused) && session.points.length >= 2 && <div className="gps-track-card"><RunTrackMap gpsTrack={session.points} height="180px" /></div>}
            {errorMsg && <div className="run-form-error" role="alert">{errorMsg}</div>}
            <div className="gps-actions">{isIdle && <button className="primary-action" onClick={handleStart}><E23Icon name="run" size={20} />开始GPS记录</button>}{isRunning && <button className="secondary-action" onClick={handlePause}>暂停记录</button>}{isPaused && <><button className="secondary-action" onClick={handleResume}>继续记录</button><button className="primary-action" onClick={handleFinish} disabled={saving}>结束并保存</button></>}</div>
          </>}
        </section>
      )}
      {mode === 'manual' && errorMsg && <div className="run-form-error">{errorMsg}</div>}
    </div>
  );
}
