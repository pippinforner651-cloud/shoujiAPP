import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const plugin = read('android/app/src/main/java/com/e23running/app/kimi/preview/run/GpsRunPlugin.java');
const service = read('android/app/src/main/java/com/e23running/app/kimi/preview/run/GpsRunService.java');
const mainActivity = read('android/app/src/main/java/com/e23running/app/kimi/preview/MainActivity.java');
const database = read('android/app/src/main/java/com/e23running/app/kimi/preview/run/RunDatabaseHelper.java');
const runPage = read('src/pages/RunPage.tsx');
const leafletMap = read('src/maps/leafletMap.ts');
const styles = read('src/index.css');
const workflowPath = resolve(process.cwd(), '.github/workflows/codex-phase1-gps-map-apk.yml');
const state = read('android/app/src/main/java/com/e23running/app/kimi/preview/run/RunState.java');

describe('native GPS contract', () => {
  it('registers the custom plugin before Capacitor creates the bridge', () => {
    const registration = mainActivity.match(/registerPlugin\([^;]+;/)?.index ?? -1;
    const bridgeCreation = mainActivity.match(/super\.onCreate\(savedInstanceState\);/)?.index ?? -1;
    expect(registration).toBeGreaterThan(-1);
    expect(bridgeCreation).toBeGreaterThan(-1);
    expect(registration).toBeLessThan(bridgeCreation);
  });

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

  it('records GPS request outcome and provider-specific callback evidence', () => {
    for (const evidence of ['locationRequestSucceeded', 'gpsCallbackCount', 'networkCallbackCount', 'firstCallbackProvider', 'lastCallbackProvider', 'lastRejectReason']) {
      expect(service).toContain(evidence);
      expect(plugin).toContain(evidence);
    }
    expect(service).not.toContain('requestLocationUpdates(\n                    LocationManager.PASSIVE_PROVIDER');
  });

  it('does not create an official run before a real GPS callback', () => {
    const startMethod = service.match(/public synchronized String startOfficialRun\(\) \{([\s\S]*?)\n\s{4}\}/)?.[1] ?? '';
    expect(startMethod).toContain('gpsCallbackCount');
    expect(startMethod).toContain('locationRequestSucceeded');
  });

  it('exposes native settings actions and complete readiness states', () => {
    for (const method of ['openAppLocationSettings', 'openSystemLocationSettings']) {
      expect(plugin).toContain(`void ${method}(PluginCall call)`);
    }
    for (const field of ['locationPermission', 'systemLocationEnabled', 'networkEnabled', 'notificationPermissionGranted']) {
      expect(plugin).toContain(field);
    }
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

describe('Phase 1.5 live map and visible diagnostics contract', () => {
  it('keeps a real map canvas at a fixed height and resizes Leaflet after reveal', () => {
    expect(styles).toMatch(/\.run-map-canvas\s*\{[^}]*height:\s*320px/s);
    expect(leafletMap).toContain('invalidateSize');
  });

  it('shows actionable GPS states instead of a silent zero-distance run', () => {
    for (const text of ['定位权限未授权', '仅大概位置，无法准确计距', '手机定位未开启', 'GPS未就绪，当前不计距离']) {
      expect(runPage).toContain(text);
    }
  });
});

describe('Phase 1.4 APK workflow contract', () => {
  it('is isolated to the Codex branch and runs every quality/build gate', () => {
    const workflow = existsSync(workflowPath) ? read('.github/workflows/codex-phase1-gps-map-apk.yml') : '';
    for (const required of ['codex/e23-phase1-gps-map-fix', 'java-version: 21', 'npm ci', 'tsc -b', 'npm run lint', 'npm run test:unit', 'npm run build', 'cap sync android', 'testDebugUnitTest', 'clean', 'assembleDebug', 'apksigner', 'verify --verbose', 'sha256sum', 'upload-artifact']) {
      expect(workflow).toContain(required);
    }
    expect(workflow).not.toContain('testDebugUnitTest clean assembleDebug');
    expect(workflow).not.toContain('prisma migrate');
    expect(workflow).not.toContain('DATABASE_URL');
  });
});
