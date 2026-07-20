import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { analyzeStartupLog } from '../../scripts/android/startup-log-analyzer.mjs';

test('extracts only the first E23 launcher fatal', () => {
  const log = `
E AndroidRuntime: FATAL EXCEPTION: main
E AndroidRuntime: Process: com.e23running.app.preview, PID: 1423
E AndroidRuntime: ClassNotFoundException: com.e23running.app.preview.MainActivity
E AndroidRuntime: FATAL EXCEPTION: unrelated
`;
  const result = analyzeStartupLog(log, 'com.e23running.app.preview');
  assert.equal(result.fatal, true);
  assert.match(result.firstFatalBlock, /ClassNotFoundException/);
  assert.doesNotMatch(result.firstFatalBlock, /unrelated/);
});

test('recognizes native, web, and persistence readiness without a fatal', () => {
  const log = `
I E23Startup: NATIVE_READY
I chromium: [INFO:CONSOLE] "[E23_STARTUP] WEB_READY"
I chromium: [INFO:CONSOLE] "[E23_STARTUP] PERSISTENCE_READY 3"
`;
  assert.deepEqual(analyzeStartupLog(log, 'com.e23running.app.preview'), {
    fatal: false,
    firstFatalBlock: '',
    nativeReady: true,
    webReady: true,
    persistenceReady: 3,
  });
});

test('device capture never clears or uninstalls user data', () => {
  const script = readFileSync(
    new URL('../../scripts/android/capture-device-startup.ps1', import.meta.url),
    'utf8',
  );
  for (const command of ['logcat -c', 'am force-stop', 'am start -W', 'logcat -d', 'pidof']) {
    assert.ok(script.includes(command), `missing command: ${command}`);
  }
  for (const resilienceCheck of ['KEYCODE_HOME', 'pm revoke', 'PERSISTENCE_READY']) {
    assert.ok(script.includes(resilienceCheck), `missing resilience check: ${resilienceCheck}`);
  }
  assert.doesNotMatch(script, /pm clear|uninstall|rm -rf/i);
});
