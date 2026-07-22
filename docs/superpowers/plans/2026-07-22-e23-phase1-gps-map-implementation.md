# E23跑起来 Phase 1.4 GPS地图闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 React/Capacitor 应用上完成可审计的安卓 GPS 状态机、真实个人跑步地图、SQLite 轨迹恢复、室内跑隔离和 Phase 1.4 APK 构建。

**Architecture:** Android Foreground Service 是 GPS 和活动数据的权威来源；纯 Java 过滤器决定每个点是否累计；React 会话控制器消费强类型原生事件；Leaflet 地图通过统一适配器渲染轨迹。等待 GPS 使用 PREPARING 状态且不创建数据库活动，正式开始只生成一个原生活动 ID。

**Tech Stack:** React 19、TypeScript 5.9、Vite 7、Capacitor 8、Android Java、SQLite、Leaflet 1.9、Vitest、Testing Library、JUnit 4、GitHub Actions。

## Global Constraints

- 只在 `codex/e23-phase1-gps-map-fix` 分支修改和提交。
- 不修改 `main`、`codex/e23-v2-baseline`、`kimi/e23-v2-product`。
- 不执行 Prisma 迁移，不连接生产数据库。
- 不启用真实微信、正式多人服务或正式27,000公里路线。
- 不生成假跑者、假排行或假班级进度。
- OSM 只作跑步页开发测试在线底图，不批量预取或离线抓取。
- V2 路线继续保持 `DRAFT`。
- 真机未验证前只表述“代码和自动构建通过，真机GPS和锁屏测试待用户验收”。

---

### Task 1: 建立可执行的行为测试基线

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/run/runSession.ts`
- Test: `src/run/runSession.test.ts`

**Interfaces:**
- Produces: `RunSessionState`、`createInitialRunSession()`、`runSessionReducer(state, event)`、`clearGoal(state)`。
- Consumes: 原生位置事件使用的 `TrackPoint` 契约。

- [ ] **Step 1: 安装固定测试依赖并增加双测试脚本**

将脚本设为：

```json
{
  "test:legacy": "node scripts/unit_test.mjs",
  "test:behavior": "vitest run",
  "test:unit": "npm run test:legacy && npm run test:behavior"
}
```

安装：

```powershell
npm.cmd install --save-dev vitest@3.2.4 @testing-library/react@16.3.0 @testing-library/jest-dom@6.6.3 jsdom@26.1.0
```

- [ ] **Step 2: 写状态机失败测试**

`src/run/runSession.test.ts`覆盖：默认户外/无目标、室内切换、等待GPS不产生activityId、一次正式开始、重复开始保持同一activityId、locationUpdate进入全部点与有效轨迹、恢复轨迹、清除目标、重建新会话不继承目标。

```ts
import { describe, expect, it } from 'vitest';
import { createInitialRunSession, runSessionReducer } from './runSession';

it('waiting GPS never creates an activity', () => {
  const state = runSessionReducer(createInitialRunSession(), { type: 'PREPARING' });
  expect(state.phase).toBe('waiting_gps');
  expect(state.activityId).toBeNull();
});

it('location events append accepted points to geoTrail', () => {
  const point = { lat: 22.60, lon: 113.97, accuracyM: 8, timestamp: 1000, accepted: true, provider: 'gps' };
  const state = runSessionReducer(createInitialRunSession(), { type: 'LOCATION', point });
  expect(state.allTrackPoints).toHaveLength(1);
  expect(state.geoTrail).toEqual([point]);
});
```

- [ ] **Step 3: 验证测试因模块不存在而失败**

Run: `npm.cmd run test:behavior -- src/run/runSession.test.ts`

Expected: FAIL，原因是 `runSession` 模块或导出不存在。

- [ ] **Step 4: 实现最小纯状态机**

```ts
export type RunPhase = 'idle' | 'waiting_gps' | 'countdown' | 'running' | 'paused' | 'recovery' | 'done';
export type RunMode = 'outdoor' | 'indoor';
export type GoalType = 'NONE' | 'DISTANCE' | 'DURATION' | 'CALORIES';
export interface RunTrackPoint { lat: number; lon: number; accuracyM: number | null; timestamp: number; accepted: boolean; provider: string; }
export interface RunSessionState {
  phase: RunPhase;
  mode: RunMode;
  activityId: string | null;
  goalType: GoalType;
  goalValue: number;
  allTrackPoints: RunTrackPoint[];
  geoTrail: RunTrackPoint[];
}
export const createInitialRunSession = (): RunSessionState => ({ phase: 'idle', mode: 'outdoor', activityId: null, goalType: 'NONE', goalValue: 0, allTrackPoints: [], geoTrail: [] });
```

- [ ] **Step 5: 运行行为测试和旧测试**

Run: `npm.cmd run test:unit`

Expected: 旧103项通过，新增状态机测试全部通过。

- [ ] **Step 6: 提交**

```powershell
git add package.json package-lock.json vitest.config.ts src/test/setup.ts src/run
git commit -m "test: establish GPS run behavior suite"
```

---

### Task 2: 实现可单测的Android GPS点质量算法

**Files:**
- Create: `android/app/src/main/java/com/e23running/app/kimi/preview/run/GpsPointEvaluator.java`
- Modify: `android/app/src/main/java/com/e23running/app/kimi/preview/run/RunState.java`
- Test: `android/app/src/test/java/com/e23running/app/kimi/preview/run/GpsPointEvaluatorTest.java`

**Interfaces:**
- Produces: `GpsPointEvaluator.evaluate(Sample, boolean): Result`、`reset()`、`restoreBaseline(Sample)`。
- Result字段: `accepted`、`rejectionReason`、`calculatedSpeedMps`、`distanceDeltaM`、`riskFlag`、`firstFix`。

- [ ] **Step 1: 写JUnit失败测试**

测试首点不计距离、第二个GPS点累计、低精度拒绝、NETWORK辅助、PASSIVE拒绝、重复点、时间倒退、模拟定位、8–12m/s风险、超过12m/s拒绝。

```java
@Test public void firstGpsFixIsBaselineOnly() {
    GpsPointEvaluator.Result r = evaluator.evaluate(sample("gps", 22.60, 113.97, 8f, 1000), true);
    assertTrue(r.accepted);
    assertTrue(r.firstFix);
    assertEquals(0d, r.distanceDeltaM, 0.001d);
}

@Test public void networkNeverAddsOfficialDistance() {
    GpsPointEvaluator.Result r = evaluator.evaluate(sample("network", 22.60, 113.97, 10f, 1000), true);
    assertFalse(r.accepted);
    assertEquals("network_assist_only", r.rejectionReason);
}
```

- [ ] **Step 2: 验证测试失败**

Run: `android\gradlew.bat -p android testDebugUnitTest --tests "*GpsPointEvaluatorTest"`

Expected: FAIL，原因是类不存在。

- [ ] **Step 3: 实现过滤器和TrackPoint字段**

`GpsPointEvaluator`使用100m、50m、0.5m、8m/s、12m/s集中常量，使用设备时间计算速度。`RunState.TrackPoint`新增：

```java
public String provider;
public double calculatedSpeed;
public double distanceDelta;
public String riskFlag;
```

- [ ] **Step 4: 验证JUnit全绿**

Run: `android\gradlew.bat -p android testDebugUnitTest`

Expected: 新增算法测试和模板测试全部通过。

- [ ] **Step 5: 提交**

```powershell
git add android/app/src/main/java/com/e23running/app/kimi/preview/run android/app/src/test/java/com/e23running/app/kimi/preview/run
git commit -m "test: define native GPS quality rules"
```

---

### Task 3: 修复SQLite结构与原生PREPARING状态机

**Files:**
- Modify: `android/app/src/main/java/com/e23running/app/kimi/preview/run/RunState.java`
- Modify: `android/app/src/main/java/com/e23running/app/kimi/preview/run/RunDatabaseHelper.java`
- Modify: `android/app/src/main/java/com/e23running/app/kimi/preview/run/GpsRunService.java`
- Modify: `android/app/src/main/java/com/e23running/app/kimi/preview/run/GpsRunPlugin.java`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Test: `src/run/nativeContract.test.ts`

**Interfaces:**
- Produces plugin methods: `checkOutdoorReadiness()`、`prepareOutdoorRun()`、`cancelPreparation()`、`startRun()`、`pauseRun()`、`resumeRun()`、`stopRun()`、`abandonRun()`、`recoverActiveRun()`、`loadActivityTrackPoints()`。
- `startRun()` returns `{ clientActivityId, startTimeMs }`，重复调用返回同一ID。

- [ ] **Step 1: 写原生契约失败测试**

测试源码契约：PREPARING不调用`createActivity`、插件声明定位权限、GPS开关结果可返回、startRun存在幂等分支、数据库升级保留旧表并新增四个轨迹字段。

- [ ] **Step 2: 运行并确认失败**

Run: `npm.cmd run test:behavior -- src/run/nativeContract.test.ts`

Expected: FAIL，缺少预定位API和新增字段。

- [ ] **Step 3: 实现权限与GPS开关检查**

插件声明：

```java
@CapacitorPlugin(name = "GpsRun", permissions = {
    @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION })
})
```

`checkOutdoorReadiness()`返回 `permission`、`fineLocation`、`gpsEnabled`，精确权限未授予时调用 `requestPermissionForAlias`，拒绝时不启动Service。

- [ ] **Step 4: 实现PREPARING与幂等正式开始**

`PREPARE_RUN`启动GPS但不写活动；`START_RUN`仅在无活动ID时调用一次`dbHelper.createActivity()`；`CANCEL_PREPARATION`在无活动时停止Service；RUNNING重复开始返回现有ID。

- [ ] **Step 5: SQLite增量升级**

数据库版本升为2；`track_points`增加 `provider`、`calculated_speed`、`distance_delta`、`risk_flag`；`run_activity`支持ABANDONED状态。`onUpgrade`只执行`ALTER TABLE ADD COLUMN`，不DROP表。

- [ ] **Step 6: 接入GpsPointEvaluator**

每个回调先构造Sample，再保存Result；所有点写SQLite并发送事件，只有accepted点累加`distanceDeltaM`。恢复时从SQLite最后有效GPS点重建过滤器基线。

- [ ] **Step 7: 运行契约测试、JUnit和Android编译**

Run:

```powershell
npm.cmd run test:behavior -- src/run/nativeContract.test.ts
android\gradlew.bat -p android testDebugUnitTest
android\gradlew.bat -p android compileDebugJavaWithJavac
```

Expected: 全部通过。

- [ ] **Step 8: 提交**

```powershell
git add android src/run/nativeContract.test.ts
git commit -m "fix: separate GPS preparation from run activity"
```

---

### Task 4: 打通原生事件、React轨迹和异常恢复

**Files:**
- Modify: `src/providers/nativeGpsPlugin.ts`
- Create: `src/run/nativeRunClient.ts`
- Create: `src/run/useRunSession.ts`
- Modify: `src/run/runSession.ts`
- Test: `src/run/nativeRunClient.test.ts`
- Test: `src/run/useRunSession.test.tsx`

**Interfaces:**
- `NativeRunClient.addLocationListener(listener): Promise<PluginListenerHandle>`。
- `NativeRunClient.loadFullTrack(activityId): Promise<RunTrackPoint[]>`。
- `useRunSession()` returns `state` and commands `prepareOutdoor`、`start`、`pause`、`resume`、`finish`、`abandon`、`recover`。

- [ ] **Step 1: 写失败测试**

```ts
it('hydrates a recovered run from SQLite points', async () => {
  client.recoverActiveRun.mockResolvedValue({ activeRun: true, clientActivityId: 'run-1', totalDistanceM: 120 });
  client.loadFullTrack.mockResolvedValue([acceptedPoint]);
  const { result } = renderHook(() => useRunSession(client));
  await waitFor(() => expect(result.current.state.phase).toBe('recovery'));
  expect(result.current.state.activityId).toBe('run-1');
  expect(result.current.state.geoTrail).toEqual([acceptedPoint]);
});
```

同时测试location事件计数、完整点与有效轨迹分离、结束时重新读取SQLite、上传点数等于有效轨迹点数、卸载时解除监听。

- [ ] **Step 2: 验证失败**

Run: `npm.cmd run test:behavior -- src/run/nativeRunClient.test.ts src/run/useRunSession.test.tsx`

- [ ] **Step 3: 实现强类型事件和轨迹分页读取**

禁止 `(window as any).Capacitor`。使用插件的 `addListener('locationUpdate', ...)`、`addListener('statsUpdate', ...)`和返回的`PluginListenerHandle.remove()`。

- [ ] **Step 4: 实现恢复与结束权威读取**

恢复和结束都调用`loadActivityTrackPoints`分页读取SQLite，以accepted GPS点建立`geoTrail`，上传前写入`uploadedTrackPointCount`。

- [ ] **Step 5: 验证并提交**

Run: `npm.cmd run test:behavior -- src/run`

```powershell
git add src/providers/nativeGpsPlugin.ts src/run
git commit -m "fix: bridge native GPS track into React sessions"
```

---

### Task 5: 实现Leaflet地图适配层与RunMap

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/maps/types.ts`
- Create: `src/maps/leafletMap.ts`
- Create: `src/components/RunMap.tsx`
- Modify: `src/index.css`
- Test: `src/components/RunMap.test.tsx`

**Interfaces:**
- `RunMapAdapter.mount(container, callbacks)`、`setCurrentPosition(point)`、`setTrack(points)`、`fitTrack()`、`setFollow(enabled)`、`destroy()`。
- `RunMap` props: `mode`、`currentPoint`、`track`、`accuracyM`、`follow`、`onFollowChange`、`onRenderedPointCount`。

- [ ] **Step 1: 安装Leaflet固定依赖**

```powershell
npm.cmd install leaflet@1.9.4
npm.cmd install --save-dev @types/leaflet@1.9.20
```

- [ ] **Step 2: 写RunMap失败测试**

测试轨迹传入适配器、跑后触发fitTrack、拖动关闭跟随、地图错误显示“地图暂时无法加载，GPS仍在记录”、错误不调用任何GPS停止命令。

- [ ] **Step 3: 验证失败**

Run: `npm.cmd run test:behavior -- src/components/RunMap.test.tsx`

- [ ] **Step 4: 实现适配层**

Leaflet创建OSM tileLayer并包含署名；当前位置使用CircleMarker，精度使用Circle，轨迹使用Polyline，跑后使用fitBounds。`tileerror`只触发地图错误回调。

- [ ] **Step 5: 实现RunMap组件和样式**

组件负责挂载/销毁适配器，不持有GPS会话；瓦片错误显示覆盖提示；支持“重新定位/恢复跟随”。

- [ ] **Step 6: 验证并提交**

Run: `npm.cmd run test:behavior -- src/components/RunMap.test.tsx`

```powershell
git add package.json package-lock.json src/maps src/components/RunMap.tsx src/components/RunMap.test.tsx src/index.css
git commit -m "feat: add real Leaflet run map adapter"
```

---

### Task 6: 重构RunPage为完整户外/室内跑闭环

**Files:**
- Modify: `src/pages/RunPage.tsx`
- Modify: `src/config.ts`
- Modify: `src/pages/ProfilePage.tsx`
- Test: `src/pages/RunPage.test.tsx`

**Interfaces:**
- Consumes: `useRunSession`与`RunMap`。
- Produces: 用户可操作的准备、倒计时、跑中、恢复、跑后和室内跑界面。

- [ ] **Step 1: 写页面行为失败测试**

测试顶部模式按钮始终存在、室内跑不调用GPS、户外跑调用prepare而非start、确认后一次start、强制开始不先stop、位置事件显示轨迹、地图/数据切换、恢复三选择、目标清除、热量估算提示。

- [ ] **Step 2: 验证失败**

Run: `npm.cmd run test:behavior -- src/pages/RunPage.test.tsx`

- [ ] **Step 3: 用会话控制器替换页面内原生副作用**

移除旧的`window.Capacitor.Plugins`、空catch、占位地图和JS伪造ID。正式ID只使用原生`startRun()`返回值。

- [ ] **Step 4: 完成三种地图状态和恢复操作**

跑前显示位置/精度，跑中显示地图与数据切换，跑后显示完整轨迹和点数；恢复页面提供继续、结束保存、放弃留痕。

- [ ] **Step 5: 保证室内跑和目标规则**

室内跑只计时，结束填写跑步机距离；目标不持久化，清除归零，达成不自动结束，热量显示估算误差。

- [ ] **Step 6: 更新版本标识**

```ts
APP_PHASE: 'Phase 1.4 Codex GPS Map Fix'
```

- [ ] **Step 7: 全部前端验证并提交**

Run:

```powershell
npx.cmd tsc -b
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run build
```

```powershell
git add src
git commit -m "fix: complete outdoor and indoor run experience"
```

---

### Task 7: Android诊断、CI和APK交付

**Files:**
- Modify: `android/app/build.gradle`
- Modify: `android/app/src/main/res/values/strings.xml`
- Create: `.github/workflows/codex-phase1-gps-map-apk.yml`
- Modify: `docs/风险清单.md`
- Create: `docs/Phase1.4_Codex_GPS地图验收清单.md`

**Interfaces:**
- Produces Artifact `E23跑起来_Phase1.4_Codex_GPS_Map_Fix`。
- Produces APK `E23跑起来_Phase1.4_Codex_GPS_Map_Fix.apk`与`apk-sha256.txt`。

- [ ] **Step 1: 增加工作流静态失败测试**

在`src/run/nativeContract.test.ts`断言工作流只触发专用分支，包含npm ci、TypeScript、lint、全部测试、Vite、Capacitor sync、JUnit、clean、assembleDebug、apksigner、SHA256和artifact，且不含Prisma或生产数据库命令。

- [ ] **Step 2: 创建独立工作流**

触发：

```yaml
on:
  push:
    branches: [codex/e23-phase1-gps-map-fix]
  workflow_dispatch:
permissions:
  contents: read
```

构建注入`VITE_COMMIT_SHA=${{ github.sha }}`，使用动态Android Build Tools目录执行apksigner。

- [ ] **Step 3: 本地全量验证**

Run:

```powershell
npm.cmd ci
npx.cmd tsc -b
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run build
npx.cmd cap sync android
android\gradlew.bat -p android clean
android\gradlew.bat -p android testDebugUnitTest
android\gradlew.bat -p android assembleDebug
```

- [ ] **Step 4: 验证、重命名APK并生成哈希**

```powershell
apksigner verify --verbose android\app\build\outputs\apk\debug\app-debug.apk
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk E23跑起来_Phase1.4_Codex_GPS_Map_Fix.apk
Get-FileHash E23跑起来_Phase1.4_Codex_GPS_Map_Fix.apk -Algorithm SHA256
```

- [ ] **Step 5: 提交并推送**

```powershell
git add .github android docs
git commit -m "ci: build Phase 1.4 GPS map APK"
git push -u origin codex/e23-phase1-gps-map-fix
```

- [ ] **Step 6: 核验Actions和受保护分支**

确认Actions Run、Artifact、APK大小、SHA256、工作区clean；重新读取main、baseline和kimi SHA并与接手值比较。

## Plan Self-Review

- 规格覆盖：GPS状态机、点过滤、SQLite、React桥接、地图、恢复、室内跑、目标、测试、CI和APK均有对应任务。
- 无占位步骤：每个任务定义了精确文件、接口、测试、命令和提交边界。
- 类型一致：`RunTrackPoint`、`clientActivityId`、`geoTrail`和原生`locationUpdate`在各任务中保持同名。
- 范围隔离：没有Prisma、正式多人、微信、路线发布或受保护分支修改。
