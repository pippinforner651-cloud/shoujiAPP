import { useEffect, useRef, useState, useCallback } from 'react';
import RunTrackMap from '../RunTrackMap';
import RunSummary from './RunSummary';
import { checkGpsPermission, requestGpsPermission } from './gpsUtils';
import {
  RunSessionData,
  createEmptySession, haversineKm, formatTime, formatPace, estimateCalories,
} from './runState';

export default function RunSession() {
  const [gpsGranted, setGpsGranted] = useState<boolean | null>(null);
  const [session, setSession] = useState<RunSessionData>(createEmptySession());
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // GPS 权限
  useEffect(() => {
    checkGpsPermission().then((state) => {
      if (state === 'granted') setGpsGranted(true);
      else if (state === 'denied') setGpsGranted(false);
      else setGpsGranted(null);
    });
  }, []);

  const handleRequestGps = async () => {
    const ok = await requestGpsPermission();
    setGpsGranted(ok);
  };

  // GPS 采集
  const startGps = useCallback(() => {
    if (watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setSession((prev) => {
          const points = [...prev.points, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timestamp: new Date(pos.timestamp).toISOString(),
            speed: pos.coords.speed ?? undefined,
            altitude: pos.coords.altitude ?? undefined,
          }];
          // 计算距离
          let newDist = prev.distanceKm;
          if (points.length >= 2) {
            const last = points[points.length - 2];
            newDist += haversineKm(last.latitude, last.longitude, pos.coords.latitude, pos.coords.longitude);
          }
          const distToUse = newDist;
          const timeToUse = (Date.now() - startTimeRef.current) / 1000;
          const pace = distToUse > 0.01 ? timeToUse / distToUse : 0;

          return {
            ...prev,
            state: 'RUNNING',
            points,
            distanceKm: Math.round(distToUse * 1000) / 1000,
            paceSec: Math.round(pace),
          };
        });
      },
      (err) => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
  }, []);

  const stopGps = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // 计时器
  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setSession((prev) => {
        if (prev.state !== 'RUNNING') return prev;
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        return {
          ...prev,
          durationSec: Math.round(elapsed),
          calories: estimateCalories(prev.distanceKm),
        };
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // 开始跑步
  const handleStart = () => {
    setSession((prev) => ({
      ...prev, state: 'RUNNING', distanceKm: 0, durationSec: 0, paceSec: 0, calories: 0, points: [],
    }));
    startGps();
    startTimer();
  };

  // 暂停
  const handlePause = () => {
    stopGps();
    stopTimer();
    setSession((prev) => ({ ...prev, state: 'PAUSED' }));
  };

  // 继续
  const handleResume = () => {
    startGps();
    startTimer();
    setSession((prev) => ({ ...prev, state: 'RUNNING' }));
  };

  // 结束
  const handleFinish = () => {
    stopGps();
    stopTimer();
    setSession((prev) => ({ ...prev, state: 'FINISHED' }));
  };

  // 重制
  const handleReset = () => {
    setSession(createEmptySession());
  };

  // 配速显示
  const paceDisplay = formatPace(session.paceSec);

  // GPS 授权提示
  if (gpsGranted === null) {
    return (
      <div className="run-session-gps">
        <div className="rs-gps-icon">📍</div>
        <div className="rs-gps-title">允许访问位置信息</div>
        <div className="rs-gps-desc">跑步功能需要使用 GPS 定位来记录你的运动轨迹</div>
        <button className="rs-gps-btn" onClick={handleRequestGps}>允许定位</button>
      </div>
    );
  }

  if (gpsGranted === false) {
    return (
      <div className="run-session-gps">
        <div className="rs-gps-icon">🚫</div>
        <div className="rs-gps-title">GPS 权限被拒绝</div>
        <div className="rs-gps-desc">请在系统设置中允许访问位置信息</div>
        <button className="rs-gps-btn" onClick={handleRequestGps}>重新请求</button>
      </div>
    );
  }

  const isIdle = session.state === 'IDLE';
  const isRunning = session.state === 'RUNNING';
  const isPaused = session.state === 'PAUSED';
  const isFinished = session.state === 'FINISHED';

  return (
    <div className="run-session">
      {isFinished ? (
        <RunSummary session={session} onReset={handleReset} />
      ) : (<>
      {/* 实时数据 */}
      <div className="rs-display">
        <div className="rs-main">{isIdle ? '准备' : formatTime(session.durationSec)}</div>
        <div className="rs-sub">{isIdle ? '开始跑步' : isPaused ? '已暂停' : '跑步中'}</div>
      </div>

      <div className="rs-stats">
        <div className="rs-stat">
          <div className="rs-stat-val">{session.distanceKm.toFixed(2)}</div>
          <div className="rs-stat-label">距离 (km)</div>
        </div>
        <div className="rs-stat">
          <div className="rs-stat-val">{paceDisplay}</div>
          <div className="rs-stat-label">配速</div>
        </div>
        <div className="rs-stat">
          <div className="rs-stat-val">{session.calories}</div>
          <div className="rs-stat-label">千卡</div>
        </div>
      </div>

      {/* 轨迹地图 */}
      {(isRunning || isPaused) && session.points.length >= 2 && (
        <div className="rs-track">
          <RunTrackMap gpsTrack={session.points} height="180px" />
          <div className="rs-track-info">{session.points.length} 个轨迹点</div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="rs-actions">
        {isIdle && <button className="rs-btn start" onClick={handleStart}>▶ 开始跑步</button>}
        {isRunning && <button className="rs-btn pause" onClick={handlePause}>⏸ 暂停</button>}
        {isPaused && (
          <>
            <button className="rs-btn resume" onClick={handleResume}>▶ 继续</button>
            <button className="rs-btn finish" onClick={handleFinish}>⏹ 结束</button>
          </>
        )}
      </div>
      </>)}
    </div>
  );
}
