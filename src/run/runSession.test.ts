import { describe, expect, it } from 'vitest';
import {
  clearGoal,
  createInitialRunSession,
  runSessionReducer,
  type RunTrackPoint,
} from './runSession';

const acceptedPoint: RunTrackPoint = {
  lat: 22.6001,
  lon: 113.9701,
  accuracyM: 8,
  timestamp: 1_000,
  accepted: true,
  provider: 'gps',
  rejectionReason: null,
  calculatedSpeedMps: 0,
  distanceDeltaM: 0,
  riskFlag: null,
  mock: false,
};

describe('runSessionReducer', () => {
  it('starts in outdoor mode with no inherited goal', () => {
    const state = createInitialRunSession();
    expect(state.mode).toBe('outdoor');
    expect(state.goalType).toBe('NONE');
    expect(state.goalValue).toBe(0);
    expect(state.activityId).toBeNull();
  });

  it('switches explicitly between outdoor and indoor modes', () => {
    const indoor = runSessionReducer(createInitialRunSession(), { type: 'SET_MODE', mode: 'indoor' });
    expect(indoor.mode).toBe('indoor');
    const outdoor = runSessionReducer(indoor, { type: 'SET_MODE', mode: 'outdoor' });
    expect(outdoor.mode).toBe('outdoor');
  });

  it('waiting for GPS never creates an activity id', () => {
    const state = runSessionReducer(createInitialRunSession(), { type: 'PREPARING' });
    expect(state.phase).toBe('waiting_gps');
    expect(state.activityId).toBeNull();
  });

  it('stores the single native activity id when the official run starts', () => {
    const preparing = runSessionReducer(createInitialRunSession(), { type: 'PREPARING' });
    const running = runSessionReducer(preparing, {
      type: 'STARTED',
      activityId: 'run-native-1',
      startTimeMs: 2_000,
    });
    expect(running.phase).toBe('running');
    expect(running.activityId).toBe('run-native-1');
    expect(running.startTimeMs).toBe(2_000);
  });

  it('keeps the original activity id if a duplicate started event arrives', () => {
    const running = runSessionReducer(createInitialRunSession(), {
      type: 'STARTED',
      activityId: 'run-native-1',
      startTimeMs: 2_000,
    });
    const duplicate = runSessionReducer(running, {
      type: 'STARTED',
      activityId: 'run-native-2',
      startTimeMs: 3_000,
    });
    expect(duplicate.activityId).toBe('run-native-1');
    expect(duplicate.startTimeMs).toBe(2_000);
  });

  it('adds every location event to audit points and accepted points to geoTrail', () => {
    const accepted = runSessionReducer(createInitialRunSession(), { type: 'LOCATION', point: acceptedPoint });
    const rejectedPoint = {
      ...acceptedPoint,
      timestamp: 2_000,
      accepted: false,
      provider: 'network',
      rejectionReason: 'network_assist_only',
    };
    const state = runSessionReducer(accepted, { type: 'LOCATION', point: rejectedPoint });
    expect(state.allTrackPoints).toEqual([acceptedPoint, rejectedPoint]);
    expect(state.geoTrail).toEqual([acceptedPoint]);
    expect(state.locationEventCount).toBe(2);
  });

  it('hydrates recovery state and rebuilds the accepted trail', () => {
    const rejected = { ...acceptedPoint, timestamp: 2_000, accepted: false, rejectionReason: 'mock_location' };
    const state = runSessionReducer(createInitialRunSession(), {
      type: 'RECOVERED',
      activityId: 'run-native-1',
      startTimeMs: 1_000,
      distanceM: 123,
      durationSec: 60,
      points: [acceptedPoint, rejected],
    });
    expect(state.phase).toBe('recovery');
    expect(state.geoTrail).toEqual([acceptedPoint]);
    expect(state.allTrackPoints).toHaveLength(2);
    expect(state.distanceM).toBe(123);
  });

  it('clears a configured goal completely', () => {
    const configured = runSessionReducer(createInitialRunSession(), {
      type: 'SET_GOAL',
      goalType: 'DISTANCE',
      goalValue: 5_000,
    });
    expect(clearGoal(configured)).toMatchObject({ goalType: 'NONE', goalValue: 0 });
  });

  it('does not inherit a goal into a new session', () => {
    const configured = runSessionReducer(createInitialRunSession(), {
      type: 'SET_GOAL',
      goalType: 'DURATION',
      goalValue: 1_800,
    });
    expect(configured.goalType).toBe('DURATION');
    expect(createInitialRunSession()).toMatchObject({ goalType: 'NONE', goalValue: 0 });
  });
});
