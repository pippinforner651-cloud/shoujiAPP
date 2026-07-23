/**
 * RunSession — Phase 1.6.1B: Native GPS Integration
 *
 * 完整状态机:
 *   IDLE → PREPARING → READY → COUNTDOWN → RUNNING ⇄ PAUSED → FINISHING → FINISHED
 *                                                                    ↓
 *                                                               SAVE_ERROR
 *
 * GPS 统一通过 GpsBridge (原生优先, Web 降级)。
 * 持久化使用 localStorage (当前方案 A)。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import E23Icon from '../E23Icon';
import RunTrackMap from '../RunTrackMap';
import ManualRunEntry from './ManualRunEntry';
import RunSummary from './RunSummary';
import { checkGpsPermission, requestGpsPermission } from './gpsUtils';
import {
  createEmptySession, estimateCalories, formatPace, formatTime, haversineKm,
  GPS_ACCURACY_READY_M, GPS_MIN_DISTANCE_KM, type RunSessionData,
} from './runState';
import { useCityStore } from '../../store/cityStore';
import { useRunStore } from '../../store/runStore';
import type { RunRecord } from '../../types/run';
import { calculateRouteProgress } from '../../utils/routeProgress';
import { buildRunSummary, type CompletedRunSummary, type RouteSnapshot } from '../../utils/runFlow';
import { buildHomeJourney } from '../../utils/homeJourney';
import { filterUnseenMilestones, findNewMilestones, MILESTONE_STORAGE_KEY, type CoreMilestone } from '../../utils/milestoneFeedback';
import {
  startEngine, stopEngine, requestSingleFix, onLocationUpdate, cleanup as cleanupBridge,
  isNativeAvailable, type GpsLocation,
} from '../../services/native/GpsBridge';

/* ===== 类型 ===== */
interface Props { onBackHome?: () => void; onViewMap?: () => void; }
interface CompletedRun { record: RunRecord; summary: CompletedRunSummary; routeAfter: RouteSnapshot; milestones: CoreMilestone[]; }

type RunPhase = 'IDLE' | 'PREPARING' | 'READY' | 'COUNTDOWN' | 'RUNNING' | 'PAUSED' | 'FINISHING' | 'FINISHED' | 'GPS_ERROR' | 'SAVE_ERROR';

interface GpsState {
  phase: RunPhase;
  callbackCount: number;
  lastLat: number;
  lastLng: number;
  accuracy: number;
  provider: string;
}

/* ===== 工具函数 ===== */
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
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateActivityId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ===== GPS 点过滤规则 ===== */
const ACCURACY_MAX_M = 200;       // 精度超过 200m 丢弃
const SPEED_MAX_KMH = 40;         // 单点速度超过 40km/h 丢弃（正常跑不可能）

function isValidGpsPoint(p: GpsLocation, prev?: GpsLocation): boolean {
  if (p.latitude === 0 && p.longitude === 0) return false;
  if (!p.latitude || !p.longitude) return false;
  if (p.accuracy != null && p.accuracy > ACCURACY_MAX_M) return false;
  if (p.speed != null && p.speed * 3.6 > SPEED_MAX_KMH) return false;
  if (prev && p.time != null && prev.time != null && p.time < prev.time) return false;
  return true;
}

/* ===== 主组件 ===== */
export default function RunSession({ onBackHome = () => undefined, onViewMap = () => undefined }: Props) {
  const [mode, setMode] = useState<'manual' | 'gps'>('manual');
  const [gpsGranted, setGpsGranted] = useState<boolean | null>(null);
  const [session, setSession] = useState<RunSessionData>(createEmptySession());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [completed, setCompleted] = useState<CompletedRun | null>(null);
  const [gpsState, setGpsState] = useState<GpsState>({ phase: 'IDLE', callbackCount: 0, lastLat: 0, lastLng: 0, accuracy: 0, provider: '' });
  const [countdownSec, setCountdownSec] = useState(3);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const activityIdRef = useRef<string>('');
  const gpsCleanupRef = useRef<(() => void) | null>(null);
  const prevPointRef = useRef<GpsLocation | null>(null);
  const basePointRef = useRef<GpsLocation | null>(null);
  const isNativeRef = useRef(false);
  const pausedRef = useRef(false);

  const addRecord = useRunStore((state) => state.addRecord);
  const checkAndUnlock = useCityStore((state) => state.checkAndUnlock);

  // 检测原生插件
  useEffect(() => {
    isNativeRef.current = isNativeAvailable();
  }, []);

  // 清理
  const cleanupAll = useCallback(() => {
    if (gpsCleanupRef.current) gpsCleanupRef.current();
    gpsCleanupRef.current = null;
    cleanupBridge();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => () => cleanupAll(), [cleanupAll]);

  /* ===== GPS 实时回调处理 ===== */
  const handleGpsLocation = useCallback((loc: GpsLocation) => {
    const phase = gpsState.phase;
    const pt: GpsLocation = { ...loc, callbackCount: (loc.callbackCount ?? 0) + 1 };

    setGpsState((prev) => ({
      ...prev,
      callbackCount: pt.callbackCount ?? prev.callbackCount + 1,
      lastLat: pt.latitude,
      lastLng: pt.longitude,
      accuracy: pt.accuracy ?? prev.accuracy,
      provider: pt.provider ?? prev.provider,
    }));

    // PREPARING: 收到首点 → READY
    if (phase === 'PREPARING') {
      if (pt.accuracy != null && pt.accuracy < GPS_ACCURACY_READY_M) {
        setGpsState((prev) => ({ ...prev, phase: 'READY' }));
        basePointRef.current = pt;
      }
      return;
    }

    // RUNNING 阶段：累计距离
    if (phase === 'RUNNING' && !pausedRef.current) {
      if (!isValidGpsPoint(pt, prevPointRef.current ?? undefined)) {
        return;
      }
      if (!basePointRef.current) {
        basePointRef.current = pt;
        prevPointRef.current = pt;
        return;
      }

      const deltaKm = haversineKm(basePointRef.current.latitude, basePointRef.current.longitude, pt.latitude, pt.longitude);
      if (deltaKm < GPS_MIN_DISTANCE_KM) {
        prevPointRef.current = pt;
        return;
      }

      // 检查累计跳跃（从 base 到当前点）
      setSession((prev) => {
        const newPoints = [...prev.points, { latitude: pt.latitude, longitude: pt.longitude, timestamp: new Date(pt.time ?? Date.now()).toISOString(), speed: pt.speed, altitude: pt.altitude }];
        const newDist = prev.distanceKm + deltaKm;
        basePointRef.current = pt;
        prevPointRef.current = pt;
        return { ...prev, points: newPoints, distanceKm: Math.round(newDist * 1000) / 1000 };
      });
    }
  }, [gpsState.phase]);

  // 订阅 GPS
  const subscribeGps = useCallback(() => {
    const unsub = onLocationUpdate(handleGpsLocation);
    gpsCleanupRef.current = unsub;
  }, [handleGpsLocation]);

  /* ===== 权限 + 预定位 ===== */
  const handlePrepare = useCallback(async () => {
    if (!gpsGranted) {
      const ok = await requestGpsPermission();
      setGpsGranted(ok);
      if (!ok) { setErrorMsg('定位权限未授权，无法开始户外跑'); return; }
    }
    setErrorMsg('');
    setGpsState((prev) => ({ ...prev, phase: 'PREPARING' }));
    setSession((prev) => ({ ...prev, state: 'PREPARING' }));

    // 启动原生引擎
    const engineStarted = await startEngine();
    if (engineStarted) {
      // 订阅定位更新
      subscribeGps();
      // 尝试快速单点定位
      requestSingleFix().then((res) => {
        if (res.success && res.location) {
          handleGpsLocation(res.location);
        }
      });
    } else {
      // 启动失败（Web 降级通过 startEngine 内部处理）
      subscribeGps();
    }

    // 超时保护：15秒后仍无首点则提示
    setTimeout(() => {
      if (gpsState.phase === 'PREPARING') {
        setErrorMsg('正在搜索GPS信号，请确保在室外开阔区域');
      }
    }, 15000);
  }, [gpsGranted, subscribeGps, handleGpsLocation]);

  /* ===== 倒计时 & 正式开始 ===== */
  const handleStartCountdown = useCallback(() => {
    setGpsState((prev) => ({ ...prev, phase: 'COUNTDOWN' }));
    setCountdownSec(3);
    const ci = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          clearInterval(ci);
          // 倒计时结束：创建 Activity，进入 RUNNING
          const newId = generateActivityId();
          activityIdRef.current = newId;
          basePointRef.current = null;
          prevPointRef.current = null;
          pausedRef.current = false;
          startTimeRef.current = Date.now();
          setSession((prev2) => ({ ...prev2, state: 'RUNNING', distanceKm: 0, durationSec: 0, points: [], paceSec: 0 }));
          setGpsState((prev2) => ({ ...prev2, phase: 'RUNNING' }));
          setErrorMsg('');
          // 启动计时器
          timerRef.current = setInterval(() => {
            setSession((s) => s.state === 'RUNNING'
              ? { ...s, durationSec: Math.round((Date.now() - startTimeRef.current) / 1000), calories: estimateCalories(s.distanceKm) }
              : s);
          }, 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /* ===== 暂停 ===== */
  const handlePause = useCallback(() => {
    pausedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setSession((prev) => ({ ...prev, state: 'PAUSED' }));
    setGpsState((prev) => ({ ...prev, phase: 'PAUSED' }));
  }, []);

  /* ===== 继续 ===== */
  const handleResume = useCallback(() => {
    pausedRef.current = false;
    basePointRef.current = null;    // 首点只重设基准
    startTimeRef.current = Date.now() - session.durationSec * 1000;
    timerRef.current = setInterval(() => {
      setSession((s) => s.state === 'RUNNING'
        ? { ...s, durationSec: Math.round((Date.now() - startTimeRef.current) / 1000), calories: estimateCalories(s.distanceKm) }
        : s);
    }, 1000);
    setSession((prev) => ({ ...prev, state: 'RUNNING' }));
    setGpsState((prev) => ({ ...prev, phase: 'RUNNING' }));
  }, [session.durationSec]);

  /* ===== 结束 ===== */
  const handleFinishConfirm = useCallback(() => {
    if (session.distanceKm < 0.1 || session.durationSec < 60) {
      setErrorMsg('GPS记录至少需要0.1公里和1分钟才能保存');
      setShowFinishConfirm(false);
      return;
    }
    setShowFinishConfirm(true);
  }, [session]);

  const handleFinishSave = useCallback(() => {
    setShowFinishConfirm(false);
    setGpsState((prev) => ({ ...prev, phase: 'FINISHING' }));
    setSaving(true);
    setErrorMsg('');

    // 停止 GPS + 计时
    cleanupAll();
    stopEngine().catch(() => {});

    try {
      const beforeRunState = useRunStore.getState();
      const beforeActualKm = beforeRunState.stats.totalDistanceKm;
      const beforeHome = buildHomeJourney(beforeRunState.records);
      const beforeCityCount = useCityStore.getState().unlockedCities.length;
      const before = routeSnapshot(beforeActualKm);

      const record = addRecord(
        localToday(),
        session.distanceKm,
        session.durationSec / 60,
        '户外GPS记录',
        session.points,
        {
          durationSec: session.durationSec,
          calories: estimateCalories(session.distanceKm),
          source: 'app_gps',
          sportType: 'running',
          verificationStatus: 'verified_device',
          deviceName: isNativeRef.current ? 'AndroidGPS' : 'WebGPS',
          synced: false,
        },
      );

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
        localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify([...new Set([...seenIds, ...milestones.map((m) => m.id)])]));
      }
      setCompleted({ record, summary: buildRunSummary(record, before, after), routeAfter: after, milestones });
      setGpsState((prev) => ({ ...prev, phase: 'FINISHED' }));
    } catch (err) {
      setErrorMsg(`保存失败：${String(err)}`);
      setGpsState((prev) => ({ ...prev, phase: 'SAVE_ERROR' }));
    } finally {
      setSaving(false);
    }
  }, [session, addRecord, checkAndUnlock, cleanupAll]);

  /* ===== 重置 ===== */
  const reset = useCallback(() => {
    setCompleted(null);
    setSession(createEmptySession());
    setGpsState({ phase: 'IDLE', callbackCount: 0, lastLat: 0, lastLng: 0, accuracy: 0, provider: '' });
    setErrorMsg('');
    setShowFinishConfirm(false);
    setCountdownSec(3);
    activityIdRef.current = '';
    basePointRef.current = null;
    prevPointRef.current = null;
    pausedRef.current = false;
  }, []);

  /* ===== 权限初始检查 ===== */
  useEffect(() => {
    checkGpsPermission().then((state) => setGpsGranted(state === 'granted' ? true : state === 'denied' ? false : null));
  }, []);

  // 已完成 → 摘要页
  if (completed) return <RunSummary {...completed} onReset={reset} onBackHome={onBackHome} onViewMap={onViewMap} />;

  const phase = gpsState.phase;
  const isIdle = phase === 'IDLE';
  const isPreparing = phase === 'PREPARING';
  const isReady = phase === 'READY';
  const isCountdown = phase === 'COUNTDOWN';
  const isRunning = phase === 'RUNNING';
  const isPaused = phase === 'PAUSED';
  const isFinishing = phase === 'FINISHING';

  return (
    <div className="run-session-v1">
      <header className="run-mode-header">
        <div>
          <p className="section-kicker">记录一次真实运动</p>
          <h1>跑完以后，旅程继续</h1>
        </div>
        <div className="run-mode-switch">
          <button className={mode === 'manual' ? 'active' : ''} onClick={() => { if (isIdle) setMode('manual'); }}>手动录入</button>
          <button className={mode === 'gps' ? 'active' : ''} onClick={() => { if (isIdle) setMode('gps'); }}>GPS记录</button>
        </div>
      </header>

      {mode === 'manual' ? (
        <ManualRunEntry onSave={(input) => {
          setSaving(true);
          try {
            const beforeRunState = useRunStore.getState();
            const beforeActualKm = beforeRunState.stats.totalDistanceKm;
            const beforeHome = buildHomeJourney(beforeRunState.records);
            const beforeCityCount = useCityStore.getState().unlockedCities.length;
            const before = routeSnapshot(beforeActualKm);
            const record = addRecord(input.date, input.distanceKm, input.durationMin, input.note, [], {
              durationSec: Math.round(input.durationMin * 60),
              calories: estimateCalories(input.distanceKm),
              source: 'manual',
              sportType: 'running',
              verificationStatus: 'manual_unverified',
              synced: false,
            });
            const afterActualKm = beforeActualKm + record.distanceKm;
            const after = routeSnapshot(afterActualKm);
            const newCities = checkAndUnlock(afterActualKm);
            const crossed = findNewMilestones(
              { totalKm: beforeActualKm, streakDays: beforeHome.streakDays, unlockedCityCount: beforeCityCount },
              { totalKm: afterActualKm, streakDays: beforeHome.streakDays, unlockedCityCount: beforeCityCount + newCities.length },
            );
            let seenIds: string[] = [];
            try { seenIds = JSON.parse(localStorage.getItem(MILESTONE_STORAGE_KEY) || '[]') as string[]; } catch { seenIds = []; }
            const milestones = filterUnseenMilestones(crossed, seenIds);
            if (milestones.length > 0) {
              localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify([...new Set([...seenIds, ...milestones.map((m) => m.id)])]));
            }
            setCompleted({ record, summary: buildRunSummary(record, before, after), routeAfter: after, milestones });
          } catch (err) {
            setErrorMsg(`保存失败：${String(err)}`);
          } finally {
            setSaving(false);
          }
        }} saving={saving} />
      ) : (
        <section className="gps-run-card">
          {gpsGranted !== true && isIdle ? (
            <div className="gps-permission-card">
              <div className="gps-permission-icon"><E23Icon name="run" size={30} /></div>
              <h2>{gpsGranted === false ? '定位权限尚未开启' : '使用GPS记录真实轨迹'}</h2>
              <p>授权后会在本机记录距离、时长和轨迹。</p>
              <button className="primary-action" onClick={async () => { const ok = await requestGpsPermission(); setGpsGranted(ok); }}>
                {gpsGranted === false ? '重新请求定位' : '允许定位并继续'}
              </button>
            </div>
          ) : (
            <>
              {/* 状态显示 */}
              <div className="gps-live-display">
                <span>
                  {isIdle ? '准备出发' : isPreparing ? '搜索GPS信号...' : isReady ? 'GPS就绪' : isCountdown ? `${countdownSec}` : isPaused ? '已暂停' : isFinishing ? '保存中...' : '记录中'}
                </span>
                <strong>{formatTime(session.durationSec)}</strong>
                <p>{session.distanceKm.toFixed(2)} km · {formatPace(session.paceSec)}</p>
              </div>

              {/* 诊断信息 */}
              <div className="gps-live-grid">
                <div><span>距离</span><strong>{session.distanceKm.toFixed(2)} km</strong></div>
                <div><span>配速</span><strong>{formatPace(session.paceSec)}</strong></div>
                <div><span>轨迹点</span><strong>{session.points.length}</strong></div>
                <div><span>GPS回调</span><strong>{gpsState.callbackCount}</strong></div>
                <div><span>精度</span><strong>{gpsState.accuracy?.toFixed(1) ?? '--'} m</strong></div>
                <div><span>provider</span><strong>{gpsState.provider || '--'}</strong></div>
              </div>

              {/* GPS 就绪精度提示 */}
              {isPreparing && <div className="gps-status-hint">正在获取GPS位置，请确保在室外开阔区域</div>}
              {isReady && <div className="gps-status-hint ready">GPS已就绪，精度 {gpsState.accuracy?.toFixed(0)}m，可以开始</div>}
              {isCountdown && <div className="gps-status-hint countdown">{countdownSec} 秒后出发</div>}

              {/* 轨迹图 */}
              {(isRunning || isPaused) && session.points.length >= 2 && (
                <div className="gps-track-card"><RunTrackMap gpsTrack={session.points} height="180px" /></div>
              )}

              {/* 错误 */}
              {errorMsg && <div className="run-form-error" role="alert">{errorMsg}</div>}

              {/* 操作按钮 */}
              <div className="gps-actions">
                {isIdle && <button className="primary-action" onClick={handlePrepare}><E23Icon name="run" size={20} />开始GPS记录</button>}
                {isReady && <button className="primary-action" onClick={handleStartCountdown}>开始跑步</button>}
                {isRunning && <><button className="secondary-action" onClick={handlePause}>暂停</button><button className="primary-action" onClick={handleFinishConfirm}>结束</button></>}
                {isPaused && <><button className="secondary-action" onClick={handleResume}>继续</button><button className="primary-action" onClick={handleFinishConfirm} disabled={saving}>结束并保存</button></>}
                {isPreparing && <div className="gps-waiting-hint">正在获取GPS定位...</div>}
              </div>

              {/* 结束确认弹窗 */}
              {showFinishConfirm && (
                <div className="gps-finish-overlay" onClick={() => setShowFinishConfirm(false)}>
                  <div className="gps-finish-dialog" onClick={(e) => e.stopPropagation()}>
                    <h3>确认结束本次户外跑？</h3>
                    <p>距离: {session.distanceKm.toFixed(2)} km | 时长: {formatTime(session.durationSec)}</p>
                    <p className="gps-finish-hint">结束后将保存记录并更新个人及团队里程。</p>
                    <div className="gps-finish-actions">
                      <button className="secondary-action" onClick={() => setShowFinishConfirm(false)}>继续跑步</button>
                      <button className="primary-action" onClick={handleFinishSave} disabled={saving}>结束并保存</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {mode === 'manual' && errorMsg && <div className="run-form-error">{errorMsg}</div>}
    </div>
  );
}
