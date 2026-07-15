import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getPreviewLabel,
  resolveBuildVariant,
} from '../src/config/buildVariant.ts';

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
});

test('Android preview build is isolated from the V1 package', () => {
  const gradle = read('../android/app/build.gradle');
  const manifest = read('../android/app/src/main/AndroidManifest.xml');
  assert.match(gradle, /com\.e23running\.app\.preview/);
  assert.match(gradle, /2\.0\.0-preview\.1/);
  assert.match(manifest, /\$\{appLabel\}/);
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
    'E23跑起来_V2预览测试版.apk',
    'VITE_MULTIPLAYER_MODE=disabled',
  ]) {
    assert.ok(workflow.includes(required), `missing workflow requirement: ${required}`);
  }
  assert.ok(!workflow.includes('prisma migrate deploy'));
});

test('preview banner styles cannot create narrow-screen horizontal overflow', () => {
  const source = read('../src/components/PreviewNotice/index.tsx');
  const styles = read('../src/App.css');
  assert.match(source, /多人功能尚未上线/);
  assert.match(styles, /\.preview-notice[\s\S]*max-width:\s*100%/);
  assert.match(styles, /\.preview-notice[\s\S]*overflow-wrap:\s*anywhere/);
});

