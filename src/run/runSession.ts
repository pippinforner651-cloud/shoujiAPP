export type RunPhase =
  | 'idle'
  | 'waiting_gps'
  | 'countdown'
  | 'running'
  | 'paused'
  | 'recovery'
  | 'done'
  | 'manual';

export type RunMode = 'outdoor' | 'indoor';
export type GoalType = 'NONE' | 'DISTANCE' | 'DURATION' | 'CALORIES';

export interface RunTrackPoint {
  lat: number;
  lon: number;
  accuracyM: number | null;
  timestamp: number;
  accepted: boolean;
  provider: string;
  rejectionReason: string | null;
  calculatedSpeedMps: number;
  distanceDeltaM: number;
  riskFlag: string | null;
  mock: boolean;
}

export interface RunSessionState {
  phase: RunPhase;
  mode: RunMode;
  activityId: string | null;
  startTimeMs: number;
  goalType: GoalType;
  goalValue: number;
  allTrackPoints: RunTrackPoint[];
  geoTrail: RunTrackPoint[];
  currentPoint: RunTrackPoint | null;
  distanceM: number;
  durationSec: number;
  acceptedPointCount: number;
  rejectedPointCount: number;
  riskPointCount: number;
  statsEventCount: number;
  locationEventCount: number;
  mapRenderedPointCount: number;
  uploadedTrackPointCount: number;
}

export type RunSessionEvent =
  | { type: 'SET_MODE'; mode: RunMode }
  | { type: 'PREPARING' }
  | { type: 'COUNTDOWN' }
  | { type: 'STARTED'; activityId: string; startTimeMs: number }
  | { type: 'LOCATION'; point: RunTrackPoint }
  | { type: 'STATS'; distanceM: number; durationSec: number; acceptedPointCount?: number; rejectedPointCount?: number; riskPointCount?: number }
  | { type: 'PAUSED' }
  | { type: 'RESUMED' }
  | { type: 'RECOVERED'; activityId: string; startTimeMs: number; distanceM: number; durationSec: number; points: RunTrackPoint[] }
  | { type: 'TRACK_HYDRATED'; points: RunTrackPoint[] }
  | { type: 'DONE' }
  | { type: 'MANUAL' }
  | { type: 'SET_GOAL'; goalType: Exclude<GoalType, 'NONE'>; goalValue: number }
  | { type: 'CLEAR_GOAL' }
  | { type: 'MAP_RENDERED'; pointCount: number }
  | { type: 'UPLOADED'; pointCount: number }
  | { type: 'RESET' };

export function createInitialRunSession(): RunSessionState {
  return {
    phase: 'idle',
    mode: 'outdoor',
    activityId: null,
    startTimeMs: 0,
    goalType: 'NONE',
    goalValue: 0,
    allTrackPoints: [],
    geoTrail: [],
    currentPoint: null,
    distanceM: 0,
    durationSec: 0,
    acceptedPointCount: 0,
    rejectedPointCount: 0,
    riskPointCount: 0,
    statsEventCount: 0,
    locationEventCount: 0,
    mapRenderedPointCount: 0,
    uploadedTrackPointCount: 0,
  };
}

export function clearGoal(state: RunSessionState): RunSessionState {
  return { ...state, goalType: 'NONE', goalValue: 0 };
}

function countPoints(points: RunTrackPoint[]) {
  return {
    acceptedPointCount: points.filter((point) => point.accepted).length,
    rejectedPointCount: points.filter((point) => !point.accepted).length,
    riskPointCount: points.filter((point) => Boolean(point.riskFlag)).length,
  };
}

export function runSessionReducer(state: RunSessionState, event: RunSessionEvent): RunSessionState {
  switch (event.type) {
    case 'SET_MODE':
      if (state.phase !== 'idle') return state;
      return { ...state, mode: event.mode };
    case 'PREPARING':
      return { ...state, phase: 'waiting_gps', activityId: null };
    case 'COUNTDOWN':
      return { ...state, phase: 'countdown' };
    case 'STARTED':
      if (state.activityId) return state;
      return {
        ...state,
        phase: 'running',
        activityId: event.activityId,
        startTimeMs: event.startTimeMs,
      };
    case 'LOCATION': {
      const allTrackPoints = [...state.allTrackPoints, event.point];
      const geoTrail = event.point.accepted ? [...state.geoTrail, event.point] : state.geoTrail;
      return {
        ...state,
        allTrackPoints,
        geoTrail,
        currentPoint: event.point,
        locationEventCount: state.locationEventCount + 1,
        ...countPoints(allTrackPoints),
      };
    }
    case 'STATS':
      return {
        ...state,
        distanceM: event.distanceM,
        durationSec: event.durationSec,
        acceptedPointCount: event.acceptedPointCount ?? state.acceptedPointCount,
        rejectedPointCount: event.rejectedPointCount ?? state.rejectedPointCount,
        riskPointCount: event.riskPointCount ?? state.riskPointCount,
        statsEventCount: state.statsEventCount + 1,
      };
    case 'PAUSED':
      return { ...state, phase: 'paused' };
    case 'RESUMED':
      return { ...state, phase: 'running' };
    case 'RECOVERED': {
      const geoTrail = event.points.filter((point) => point.accepted);
      return {
        ...state,
        phase: 'recovery',
        mode: 'outdoor',
        activityId: event.activityId,
        startTimeMs: event.startTimeMs,
        distanceM: event.distanceM,
        durationSec: event.durationSec,
        allTrackPoints: [...event.points],
        geoTrail,
        currentPoint: event.points.at(-1) ?? null,
        locationEventCount: event.points.length,
        ...countPoints(event.points),
      };
    }
    case 'DONE':
      return { ...state, phase: 'done' };
    case 'TRACK_HYDRATED': {
      const geoTrail = event.points.filter((point) => point.accepted && point.provider === 'gps');
      return {
        ...state,
        allTrackPoints: [...event.points],
        geoTrail,
        currentPoint: event.points.at(-1) ?? null,
        locationEventCount: event.points.length,
        ...countPoints(event.points),
      };
    }
    case 'MANUAL':
      return { ...state, phase: 'manual' };
    case 'SET_GOAL':
      return { ...state, goalType: event.goalType, goalValue: Math.max(0, event.goalValue) };
    case 'CLEAR_GOAL':
      return clearGoal(state);
    case 'MAP_RENDERED':
      return { ...state, mapRenderedPointCount: event.pointCount };
    case 'UPLOADED':
      return { ...state, uploadedTrackPointCount: event.pointCount };
    case 'RESET':
      return createInitialRunSession();
  }
}
