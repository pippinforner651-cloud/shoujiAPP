import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const plugin = read('android/app/src/main/java/com/e23running/app/kimi/preview/run/GpsRunPlugin.java');
const service = read('android/app/src/main/java/com/e23running/app/kimi/preview/run/GpsRunService.java');
const database = read('android/app/src/main/java/com/e23running/app/kimi/preview/run/RunDatabaseHelper.java');
const state = read('android/app/src/main/java/com/e23running/app/kimi/preview/run/RunState.java');

describe('native GPS contract', () => {
  it('declares an explicit fine/coarse location permission alias', () => {
    expect(plugin).toContain('@Permission');
    expect(plugin).toContain('alias = "location"');
    expect(plugin).toContain('ACCESS_FINE_LOCATION');
    expect(plugin).toContain('ACCESS_COARSE_LOCATION');
  });

  it('exposes readiness, preparation, cancellation and abandonment methods', () => {
    for (const method of ['checkOutdoorReadiness', 'prepareOutdoorRun', 'cancelPreparation', 'abandonRun']) {
      expect(plugin).toContain(`void ${method}(PluginCall call)`);
    }
  });

  it('checks the GPS system switch before preparation', () => {
    expect(plugin).toContain('isProviderEnabled(LocationManager.GPS_PROVIDER)');
    expect(plugin).toContain('gpsEnabled');
  });

  it('has a PREPARING state that does not create a database activity', () => {
    expect(state).toContain('STATE_PREPARING');
    expect(service).toContain('prepareRun()');
    const preparingMethod = service.match(/private synchronized void prepareRun\(\) \{([\s\S]*?)\n\s{4}\}/)?.[1] ?? '';
    expect(preparingMethod).not.toContain('createActivity');
  });

  it('creates the activity only when the official run starts and reuses it', () => {
    expect(service).toContain('dbHelper.createActivity');
    expect(service).toContain('currentActivityId != null');
    expect(plugin).toContain('clientActivityId');
  });

  it('uses an additive SQLite version upgrade with audit fields', () => {
    expect(database).toMatch(/DB_VERSION\s*=\s*[2-9]/);
    expect(database).toContain('ALTER TABLE');
    for (const column of ['provider', 'calculated_speed', 'distance_delta', 'risk_flag']) {
      expect(database).toContain(column);
    }
    expect(database).not.toContain('DROP TABLE');
  });

  it('persists provider, calculated speed, distance delta and risk on each point', () => {
    for (const field of ['provider', 'calculatedSpeed', 'distanceDelta', 'riskFlag']) {
      expect(state).toContain(`public ${field === 'provider' || field === 'riskFlag' ? 'String' : 'double'} ${field}`);
    }
    expect(database).toContain('point.provider');
    expect(database).toContain('point.calculatedSpeed');
    expect(database).toContain('point.distanceDelta');
    expect(database).toContain('point.riskFlag');
  });

  it('uses the pure evaluator rather than the obsolete unused speed constant', () => {
    expect(service).toContain('GpsPointEvaluator');
    expect(service).not.toContain('MAX_SUSPICIOUS_SPEED');
  });

  it('preserves abandoned runs instead of deleting their SQLite tracks', () => {
    expect(state).toContain('STATE_ABANDONED');
    expect(database).toContain('abandonActivity');
    expect(plugin).not.toMatch(/abandonRun[\s\S]{0,600}delete/i);
  });
});
