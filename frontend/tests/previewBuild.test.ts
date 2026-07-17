import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getActiveScaleRatio,
  getPreviewLabel,
  resolveBuildVariant,
} from '../src/config/buildVariant.ts';
import { calculatePreviewRouteProgressCore } from '../src/utils/previewRouteProgressCore.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('V1 remains the default build variant', () => {
  assert.equal(resolveBuildVariant(undefined), 'v1');
  assert.equal(resolveBuildVariant('unexpected'), 'v1');
  assert.equal(getPreviewLabel('v1'), null);
});

test('V2 preview is explicitly labelled and multiplayer is not presented as live', () => {
  assert.equal(resolveBuildVariant('v2-preview'), 'v2-preview');
  assert.match(getPreviewLabel('v2-preview') ?? '', /V2.*预览测试版/);
  assert.match(getPreviewLabel('v2-preview') ?? '', /多人功能尚未上线/);
  assert.equal(getActiveScaleRatio('v2-preview', 10), 1);
  assert.equal(getActiveScaleRatio('v1', 10), 10);
  const previewProgress = calculatePreviewRouteProgressCore(1, {
    meta: { total_distance_km: 27000, scale_ratio: 10, start_city: '深圳', end_city: '深圳' },
    nodes: [
      { id: 'start', city: '深圳', total_distance_km: 0 },
      { id: 'next', city: '下一站', total_distance_km: 100 },
    ],
    closure: { from_city: '下一站', to_city: '深圳', distance_km: 26900, total_distance_km: 27000 },
  });
  assert.equal(previewProgress.virtualDistanceKm, 1);
});

test('V2 preview copy explains one-to-one progress and the unlaunched route', () => {
  const guide = read('../src/pages/FirstRunGuide.tsx');
  const home = read('../src/MainApp.tsx');
  const login = read('../src/pages/Login/index.tsx');
  for (const source of [guide, home, login]) {
    assert.match(source, /IS_V2_PREVIEW/);
  }
  assert.match(guide + home, /1:1/);
  assert.match(guide + home, /27,000\+/);
  assert.match(guide + home, /正式路线.*未上线/);
});

test('Android preview build is isolated from the V1 package', () => {
  const gradle = read('../android/app/build.gradle');
  const manifest = read('../android/app/src/main/AndroidManifest.xml');
  const activity = read('../android/app/src/main/java/com/e23running/app/MainActivity.java');
  assert.match(gradle, /com\.e23running\.app\.preview/);
  assert.match(gradle, /versionCode e23Preview \? 20003 : 2/);
  assert.match(gradle, /2\.0\.0-preview\.3/);
  assert.match(manifest, /\$\{appLabel\}/);
  assert.match(manifest, /android:name="com\.e23running\.app\.MainActivity"/);
  assert.match(activity, /package com\.e23running\.app;/);
});

test('APK workflow contains the required preview quality and safety gates', () => {
  const workflow = read('../../.github/workflows/build-apk.yml');
  for (const required of [
    'build_variant',
    'v2-preview',
    'codex/e23-v2-baseline',
    'npm ci',
    'npm run typecheck',
    'npm test',
    'npm run build:vite',
    'npx cap sync android',
    'assembleDebug',
    'apksigner',
    'sha256sum',
    'E23跑起来_V2预览测试版_R2.apk',
    'VITE_MULTIPLAYER_MODE=disabled',
  ]) {
    assert.ok(workflow.includes(required), `missing workflow requirement: ${required}`);
  }
  assert.ok(!workflow.includes('prisma migrate deploy'));
});

test('Android startup exposes non-sensitive readiness markers', () => {
  const activity = read('../android/app/src/main/java/com/e23running/app/MainActivity.java');
  const main = read('../src/main.tsx');
  assert.match(activity, /Log\.i\("E23Startup", "NATIVE_READY"\)/);
  assert.match(main, /\[E23_STARTUP\] WEB_READY/);
  assert.doesNotMatch(activity + main, /token|secret|openid|latitude|longitude/i);
});

test('APK upload follows five emulator cold starts and resilience checks', () => {
  const workflow = read('../../.github/workflows/build-apk.yml');
  const smoke = read('../../scripts/android/emulator-smoke.sh');
  assert.match(workflow, /android-emulator-runner/);
  assert.ok(workflow.indexOf('android-emulator-runner') < workflow.indexOf('Upload debug APK artifact'));
  assert.match(workflow, /api-level:\s*35/);
  assert.match(workflow, /disable-animations:\s*false/);
  assert.match(smoke, /seq 1 5/);
  assert.match(smoke, /am force-stop/);
  assert.match(smoke, /am start -W/);
  assert.match(smoke, /E23Startup.*NATIVE_READY/);
  assert.match(smoke, /E23_STARTUP.*WEB_READY/);
  assert.match(smoke, /PERSISTENCE_READY/);
  assert.match(smoke, /FATAL EXCEPTION/);
  assert.match(smoke, /KEYCODE_HOME/);
  assert.match(smoke, /pm revoke/);
});

test('preview banner styles cannot create narrow-screen horizontal overflow', () => {
  const source = read('../src/components/PreviewNotice/index.tsx');
  const styles = read('../src/App.css');
  assert.match(source, /多人功能尚未上线/);
  assert.match(styles, /\.preview-notice[\s\S]*max-width:\s*100%/);
  assert.match(styles, /\.preview-notice[\s\S]*overflow-wrap:\s*anywhere/);
});
