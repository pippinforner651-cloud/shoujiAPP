# E23 Android Startup Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a V2 preview APK whose launcher crash has a complete evidence chain and which passes five emulator cold starts plus five physical-device cold starts without data deletion.

**Architecture:** Keep the React/Capacitor application and Android project. Add non-destructive log capture, deterministic log analysis, native/web readiness markers, and an emulator smoke gate before final artifact upload. Treat the historical launcher package mismatch as a hypothesis until old-APK reproduction and current-device logs establish the evidence.

**Tech Stack:** React 19, TypeScript 5.7, Capacitor Android 8.4.1, Java, Gradle, Android SDK/ADB, Node `node:test`, PowerShell, GitHub Actions.

## Global Constraints

- Work only on `codex/e23-v2-baseline`; keep PR #1 Draft.
- Do not merge or modify `main`.
- Do not run Prisma migrations or connect to production.
- Do not enable WeChat, AMap, OSM public tiles, cloud multiplayer, or production credentials.
- Never uninstall the user's app, run `adb shell pm clear`, or delete local data.
- Do not call an APK deliverable until emulator and physical-device gates both pass.
- Keep `data/route_packages/e23-china-loop-v2.draft.json` in `DRAFT`.
- Save physical-device logs only under `D:\CODEX制作文件\E23跑起来_Android启动取证_20260717`; never commit them.
- Historical APK: `D:\CODEX制作文件\E23跑起来_V2安卓预览版_20260715\E23跑起来_V2预览测试版.apk`.
- Current candidate: `D:\CODEX制作文件\E23跑起来_安卓闪退修复_20260717\E23跑起来_V2预览测试版_闪退修复.apk`.
- Preview application ID: `com.e23running.app.preview`.
- Launcher class: `com.e23running.app.MainActivity`.

## Evidence Chain

Every conclusion must link:

1. APK SHA256 and source commit.
2. Device model, API level, ABI, and app version.
3. Exact `am start -W` command and result.
4. Complete timestamped logcat.
5. First fatal block, or explicit proof that none exists.
6. Native and web readiness markers while the process remains alive.
7. Five emulator and five phone round summaries.

Stop without changing code if ADB sees other than one phone, signature compatibility would require uninstalling, the first cause is ambiguous, or three hypotheses have failed.

## Failure Rollback

- Keep final APK upload after the emulator gate; failed smoke tests create no deliverable.
- Revert only the single failing commit with `git revert`; never reset the branch.
- Preserve the last known candidate APK and all failed logs.
- Use a clean emulator or separate approved phone for signing conflicts; never delete user data.

---

### Task 1: Add deterministic startup log analysis

**Files:**
- Create: `scripts/android/startup-log-analyzer.mjs`
- Create: `frontend/tests/androidStartupLog.test.ts`

**Interfaces:**
- Consumes: UTF-8 logcat text and application ID.
- Produces: `analyzeStartupLog(logText, applicationId)` returning `{ fatal, firstFatalBlock, nativeReady, webReady }`.

- [ ] **Step 1: Write the failing tests**

```ts
import assert from 'node:assert/strict';
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

test('recognizes native and web readiness without a fatal', () => {
  const log = `
I E23Startup: NATIVE_READY
I chromium: [INFO:CONSOLE] "[E23_STARTUP] WEB_READY"
`;
  assert.deepEqual(analyzeStartupLog(log, 'com.e23running.app.preview'), {
    fatal: false,
    firstFatalBlock: '',
    nativeReady: true,
    webReady: true,
  });
});
```

- [ ] **Step 2: Run and verify failure**

```powershell
Set-Location frontend
npm.cmd test -- --test-name-pattern="startup"
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the analyzer**

```js
export function analyzeStartupLog(logText, applicationId) {
  const lines = String(logText).split(/\r?\n/);
  const start = lines.findIndex((line) => line.includes('FATAL EXCEPTION'));
  let firstFatalBlock = '';
  if (start >= 0) {
    const block = [];
    for (let index = start; index < lines.length; index += 1) {
      if (index > start && lines[index].includes('FATAL EXCEPTION')) break;
      block.push(lines[index]);
    }
    const candidate = block.join('\n');
    if (candidate.includes(applicationId) || candidate.includes('AndroidRuntime')) {
      firstFatalBlock = candidate.trim();
    }
  }
  return {
    fatal: firstFatalBlock.length > 0,
    firstFatalBlock,
    nativeReady: lines.some((line) => line.includes('E23Startup') && line.includes('NATIVE_READY')),
    webReady: lines.some((line) => line.includes('[E23_STARTUP] WEB_READY')),
  };
}
```

- [ ] **Step 4: Run focused and full tests**

```powershell
Set-Location frontend
npm.cmd test -- --test-name-pattern="startup"
npm.cmd test
```

Expected: focused tests and full suite PASS.

- [ ] **Step 5: Commit**

```powershell
git add scripts/android/startup-log-analyzer.mjs frontend/tests/androidStartupLog.test.ts
git commit -m "test: add Android startup log analysis"
```

---

### Task 2: Add non-destructive phone log capture

**Files:**
- Create: `scripts/android/capture-device-startup.ps1`
- Modify: `frontend/tests/androidStartupLog.test.ts`

**Interfaces:**
- Consumes: ADB path, output folder, application ID, activity class, rounds.
- Produces: raw logcat, `am start -W` output, and result JSON per round.

- [ ] **Step 1: Add a failing safety test**

```ts
import { readFileSync } from 'node:fs';

test('device capture never clears or uninstalls user data', () => {
  const script = readFileSync(
    new URL('../../scripts/android/capture-device-startup.ps1', import.meta.url),
    'utf8',
  );
  for (const command of ['logcat -c', 'am force-stop', 'am start -W', 'logcat -d', 'pidof']) {
    assert.ok(script.includes(command), `missing command: ${command}`);
  }
  assert.doesNotMatch(script, /pm clear|uninstall|rm -rf/i);
});
```

- [ ] **Step 2: Run and verify failure**

```powershell
Set-Location frontend
npm.cmd test -- --test-name-pattern="device capture"
```

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement `capture-device-startup.ps1`**

```powershell
param(
  [Parameter(Mandatory = $true)][string]$AdbPath,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [string]$ApplicationId = 'com.e23running.app.preview',
  [string]$ActivityClass = 'com.e23running.app.MainActivity',
  [ValidateRange(1, 5)][int]$Rounds = 1
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$devices = & $AdbPath devices | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
if (@($devices).Count -ne 1) {
  throw "Expected exactly one authorized Android device; found $(@($devices).Count)."
}

$serial = (($devices | Select-Object -First 1) -split '\s+')[0]
$model = (& $AdbPath -s $serial shell getprop ro.product.model).Trim()
$apiLevel = (& $AdbPath -s $serial shell getprop ro.build.version.sdk).Trim()
$abi = (& $AdbPath -s $serial shell getprop ro.product.cpu.abi).Trim()
$component = "$ApplicationId/$ActivityClass"

for ($round = 1; $round -le $Rounds; $round += 1) {
  $prefix = Join-Path $OutputDirectory ("round-{0:D2}" -f $round)
  & $AdbPath -s $serial logcat -c
  & $AdbPath -s $serial shell am force-stop $ApplicationId
  $launch = & $AdbPath -s $serial shell am start -W -n $component 2>&1
  $alive = $false
  for ($attempt = 1; $attempt -le 20; $attempt += 1) {
    Start-Sleep -Milliseconds 500
    $appProcess = (& $AdbPath -s $serial shell pidof $ApplicationId 2>$null).Trim()
    if ($appProcess) { $alive = $true; break }
  }
  Start-Sleep -Seconds 2
  $log = & $AdbPath -s $serial logcat -d -v threadtime
  $launch | Set-Content -LiteralPath "$prefix-launch.txt" -Encoding UTF8
  $log | Set-Content -LiteralPath "$prefix-logcat.txt" -Encoding UTF8
  [ordered]@{
    round = $round
    serial = $serial
    model = $model
    apiLevel = $apiLevel
    abi = $abi
    applicationId = $ApplicationId
    activityClass = $ActivityClass
    processAlive = $alive
    fatalDetected = (($log -join "`n") -match 'FATAL EXCEPTION')
    capturedAt = (Get-Date).ToString('o')
  } | ConvertTo-Json | Set-Content -LiteralPath "$prefix-result.json" -Encoding UTF8
}
```

The script intentionally does not install, uninstall, or clear the app.

- [ ] **Step 4: Run safety and full tests**

```powershell
Set-Location frontend
npm.cmd test -- --test-name-pattern="device capture"
npm.cmd test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add scripts/android/capture-device-startup.ps1 frontend/tests/androidStartupLog.test.ts
git commit -m "test: add non-destructive Android device capture"
```

---

### Task 3: Establish the unique root cause

**Files:**
- Evidence: `D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\historical-crash\`
- Evidence: `D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\current-device-baseline\`
- Evidence: `D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\root-cause-report.md`

**Interfaces:**
- Consumes: old APK, current phone build, log analyzer, Git history.
- Produces: one evidence-backed first cause.

- [ ] **Step 1: Capture the current phone before changing it**

Prepare official Android platform-tools in the evidence folder when ADB is absent:

```powershell
$evidenceRoot = 'D:\CODEX制作文件\E23跑起来_Android启动取证_20260717'
$adb = Join-Path $evidenceRoot 'platform-tools\adb.exe'
if (-not (Test-Path -LiteralPath $adb)) {
  $zip = Join-Path $evidenceRoot 'platform-tools-latest-windows.zip'
  New-Item -ItemType Directory -Path $evidenceRoot -Force | Out-Null
  Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile $zip
  Expand-Archive -LiteralPath $zip -DestinationPath $evidenceRoot -Force
}
& $adb version
```

Expected: ADB reports its version. The download source is the official Android repository.

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts\android\capture-device-startup.ps1 `
  -AdbPath "D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\platform-tools\adb.exe" `
  -OutputDirectory "D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\current-device-baseline" `
  -ApplicationId "com.e23running.app.preview" `
  -ActivityClass "com.e23running.app.MainActivity" `
  -Rounds 1
```

Expected: exactly one device and a complete evidence set. If package or component differs, record it and stop without uninstalling.

- [ ] **Step 2: Reproduce the preserved old APK on a clean emulator**

```powershell
adb install "D:\CODEX制作文件\E23跑起来_V2安卓预览版_20260715\E23跑起来_V2预览测试版.apk"
adb logcat -c
adb shell am start -W -n com.e23running.app.preview/com.e23running.app.preview.MainActivity
adb logcat -d -v threadtime
```

Expected historical chain: `FATAL EXCEPTION` → `Unable to instantiate activity` → `ClassNotFoundException`.

- [ ] **Step 3: Correlate the fatal with source history**

```powershell
git show c7b6084:frontend/android/app/src/main/AndroidManifest.xml
git show c7b6084:frontend/android/app/src/main/java/com/chinarun/app/MainActivity.java
git show c7b6084:frontend/android/app/build.gradle
git show 4b5fa8f -- frontend/android frontend/tests/previewBuild.test.ts
```

Expected: historical `.MainActivity` resolves under the preview application ID, while Java declared `com.chinarun.app`; commit `4b5fa8f` supplies explicit `com.e23running.app.MainActivity` and matching package/path.

- [ ] **Step 4: Write `root-cause-report.md`**

```markdown
# E23 Android启动唯一根因报告

- 历史APK SHA256：
- 当前候选APK SHA256：
- 真机型号/API/ABI：
- 首个FATAL时间：
- 首个异常类型：
- 唯一根因：
- Manifest解析到的Activity：
- APK内实际Activity类：
- 对应修复提交：
- 是否发现第二个独立根因：
- 原始日志目录：
```

Every filled field must cite a raw log or source diff. If the current phone has no fatal, record that as current-candidate validation rather than historical reproduction.

- [ ] **Step 5: Apply the root-cause decision**

- If only the historical launcher mismatch is confirmed and current candidate starts, make no additional speculative runtime fix.
- If the current candidate has a different first fatal, stop and create a root-cause-specific amendment before code changes.
- If signing prevents comparison, preserve phone data and use the clean emulator.

Raw logs are never committed.

---

### Task 4: Add native and web readiness markers

**Files:**
- Modify: `frontend/android/app/src/main/java/com/e23running/app/MainActivity.java`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/tests/previewBuild.test.ts`

**Interfaces:**
- Produces: `E23Startup: NATIVE_READY` and `[E23_STARTUP] WEB_READY`.

- [ ] **Step 1: Add a failing marker contract**

```ts
test('Android startup exposes non-sensitive readiness markers', () => {
  const activity = read('../android/app/src/main/java/com/e23running/app/MainActivity.java');
  const main = read('../src/main.tsx');
  assert.match(activity, /Log\.i\("E23Startup", "NATIVE_READY"\)/);
  assert.match(main, /\[E23_STARTUP\] WEB_READY/);
  assert.doesNotMatch(activity + main, /token|secret|openid|latitude|longitude/i);
});
```

- [ ] **Step 2: Run and verify failure**

```powershell
Set-Location frontend
npm.cmd test -- --test-name-pattern="readiness markers"
```

Expected: FAIL.

- [ ] **Step 3: Add the native marker**

```java
package com.e23running.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onPostCreate(Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);
        Log.i("E23Startup", "NATIVE_READY");
    }
}
```

- [ ] **Step 4: Add the web marker**

After `createRoot(...).render(...)` in `frontend/src/main.tsx`:

```ts
console.info('[E23_STARTUP] WEB_READY')
```

- [ ] **Step 5: Run tests and commit**

```powershell
Set-Location frontend
npm.cmd test
Set-Location ..
git add frontend/android/app/src/main/java/com/e23running/app/MainActivity.java frontend/src/main.tsx frontend/tests/previewBuild.test.ts
git commit -m "test: expose Android startup readiness markers"
```

Expected: all frontend tests PASS.

---

### Task 5: Gate artifact upload on five emulator cold starts

**Files:**
- Create: `scripts/android/emulator-smoke.sh`
- Modify: `.github/workflows/build-apk.yml`
- Modify: `frontend/tests/previewBuild.test.ts`

**Interfaces:**
- Consumes: debug APK.
- Produces: five log sets and `android-smoke-summary.txt`.

- [ ] **Step 1: Add a failing workflow contract**

```ts
test('APK upload follows five emulator cold starts', () => {
  const workflow = read('../../.github/workflows/build-apk.yml');
  const smoke = read('../../scripts/android/emulator-smoke.sh');
  assert.match(workflow, /android-emulator-runner/);
  assert.ok(workflow.indexOf('android-emulator-runner') < workflow.indexOf('Upload debug APK artifact'));
  assert.match(smoke, /seq 1 5/);
  assert.match(smoke, /am force-stop/);
  assert.match(smoke, /am start -W/);
  assert.match(smoke, /E23Startup.*NATIVE_READY/);
  assert.match(smoke, /E23_STARTUP.*WEB_READY/);
  assert.match(smoke, /FATAL EXCEPTION/);
});
```

- [ ] **Step 2: Run and verify failure**

```powershell
Set-Location frontend
npm.cmd test -- --test-name-pattern="five emulator cold starts"
```

Expected: FAIL.

- [ ] **Step 3: Create `emulator-smoke.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
APK_PATH="${1:?APK path required}"
APPLICATION_ID="${2:-com.e23running.app.preview}"
ACTIVITY_CLASS="${3:-com.e23running.app.MainActivity}"
OUTPUT_DIR="${4:-android-smoke-logs}"
COMPONENT="${APPLICATION_ID}/${ACTIVITY_CLASS}"

mkdir -p "$OUTPUT_DIR"
adb install "$APK_PATH"
for round in $(seq 1 5); do
  prefix="$OUTPUT_DIR/round-$(printf '%02d' "$round")"
  adb logcat -c
  adb shell am force-stop "$APPLICATION_ID"
  adb shell am start -W -n "$COMPONENT" | tee "${prefix}-launch.txt"
  ready=0
  for attempt in $(seq 1 30); do
    adb logcat -d -v threadtime > "${prefix}-logcat.txt"
    if adb shell pidof "$APPLICATION_ID" >/dev/null 2>&1 \
      && grep -q 'E23Startup.*NATIVE_READY' "${prefix}-logcat.txt" \
      && grep -q 'E23_STARTUP.*WEB_READY' "${prefix}-logcat.txt"; then
      ready=1
      break
    fi
    sleep 1
  done
  adb logcat -d -v threadtime > "${prefix}-logcat.txt"
  ! grep -q 'FATAL EXCEPTION' "${prefix}-logcat.txt"
  [[ "$ready" -eq 1 ]]
  echo "round=$round status=PASS" | tee -a "$OUTPUT_DIR/android-smoke-summary.txt"
done
```

- [ ] **Step 4: Insert the gate before signature/copy/upload**

```yaml
      - name: Five-round Android emulator cold-start gate
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 35
          arch: x86_64
          profile: pixel_6
          disable-animations: true
          script: >-
            bash scripts/android/emulator-smoke.sh
            frontend/android/app/build/outputs/apk/debug/app-debug.apk
            com.e23running.app.preview
            com.e23running.app.MainActivity
            android-smoke-logs

      - name: Upload Android startup evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: android-startup-evidence-${{ github.run_id }}
          path: android-smoke-logs
          retention-days: 30
          if-no-files-found: warn
```

Keep final APK signature/SHA256 and artifact upload after this gate.

- [ ] **Step 5: Run tests and commit**

```powershell
Set-Location frontend
npm.cmd test
Set-Location ..
git add scripts/android/emulator-smoke.sh .github/workflows/build-apk.yml frontend/tests/previewBuild.test.ts
git commit -m "ci: gate preview APK on repeated cold starts"
```

Expected: all frontend tests PASS.

---

### Task 6: Run full verification and push

**Files:** No new source files.

- [ ] **Step 1: Frontend verification**

```powershell
Set-Location frontend
npm.cmd run typecheck
npm.cmd test
npm.cmd run build:vite
```

Expected: all exit 0.

- [ ] **Step 2: Backend verification**

```powershell
Set-Location backend
npm.cmd test
npm.cmd run build
$env:DATABASE_URL='postgresql://test:test@localhost:5432/test'
.\node_modules\.bin\prisma.cmd validate
```

Expected: tests/build pass and schema is valid without a database connection.

- [ ] **Step 3: Safety verification**

```powershell
Set-Location ..
node scripts\pr-safety-check.mjs origin/main HEAD
git diff --check
git status --short
```

Expected: safety gate passes and worktree is clean.

- [ ] **Step 4: Push and inspect Actions**

```powershell
git push origin codex/e23-v2-baseline
```

Required evidence: PR checks success, Android workflow success, five emulator PASS lines, five raw logs, signature verification, and SHA256. PR remains Draft. The APK is still not deliverable until Task 7.

---

### Task 7: Execute five physical-device cold starts

**Files:**
- Evidence: `D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\physical-five-rounds\`
- Evidence: `D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\android-startup-acceptance.md`

- [ ] **Step 1: Match APK identity**

```powershell
$candidateApk = 'D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\E23跑起来_V2预览测试版_启动候选.apk'
Get-FileHash -Algorithm SHA256 -LiteralPath $candidateApk
```

Match Actions SHA256. Confirm with `aapt dump badging`:

```text
package: name='com.e23running.app.preview'
launchable-activity: name='com.e23running.app.MainActivity'
```

- [ ] **Step 2: Check signature compatibility**

```powershell
$adb = 'D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\platform-tools\adb.exe'
& $adb install -r $candidateApk
```

If `INSTALL_FAILED_UPDATE_INCOMPATIBLE` occurs, stop and use a separate approved test phone. Do not uninstall.

- [ ] **Step 3: Capture five rounds**

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts\android\capture-device-startup.ps1 `
  -AdbPath "D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\platform-tools\adb.exe" `
  -OutputDirectory "D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\physical-five-rounds" `
  -ApplicationId "com.e23running.app.preview" `
  -ActivityClass "com.e23running.app.MainActivity" `
  -Rounds 5
```

Expected for every round: process alive, no fatal, native marker, web marker.

- [ ] **Step 4: Verify resume, permission denial, and persistence**

- Three Home/reopen cycles remain usable without fatal.
- Denying location on the running page shows a clear non-crashing state.
- A clearly marked local test record survives force-stop and reopen.
- Existing user data is not removed.

- [ ] **Step 5: Write physical acceptance**

Record commit, Actions run, APK filename/size/SHA256/certificate, phone model/API/ABI, 5/5 cold starts, 3/3 resume cycles, permission result, persistence result, known issues, and `PASS` or `FAIL`.

---

### Task 8: Declare or reject the APK

**Files:**
- Create only after pass: `D:\CODEX制作文件\E23跑起来_Android启动取证_20260717\E23_V2安卓启动稳定性报告.md`

- [ ] **Step 1: Apply the acceptance rule**

PASS requires: unique root cause documented; no unresolved current fatal; all source checks pass; emulator 5/5; phone 5/5; resume 3/3; denial does not crash; persistence passes; signature/SHA256 verified; PR Draft; main unchanged.

- [ ] **Step 2: Handle failure**

Report `仍需整改`, retain evidence, do not deliver the APK, return to systematic debugging Phase 1, and do not start route production.

- [ ] **Step 3: Handle success**

Copy the exact gated APK and SHA256 to the D-drive evidence folder as `E23跑起来_V2预览测试版_启动验证通过.apk`, report all evidence, keep PR Draft, then begin the real-route plan.
