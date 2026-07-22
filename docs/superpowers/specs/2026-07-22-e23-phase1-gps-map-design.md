# E23跑起来 Phase 1.4 GPS与真实跑步地图闭环设计

## 1. 目标与边界

本阶段在提交 `218c3e1d5dc07a68dcbc5ce4be857f4585b65920` 的既有 React、Capacitor、Android Foreground Service 和原生 SQLite 成果上，完成安卓户外跑的真实 GPS 数据闭环、开发测试地图、异常恢复、室内跑隔离和目标功能验收。

本阶段不重写整个应用，不修改 `main`、`codex/e23-v2-baseline` 或 `kimi/e23-v2-product`，不执行 Prisma 迁移，不连接生产数据库，不启用真实微信或正式多人服务，不修改 V1 冻结路线和历史 1:10 数据，也不把未核验的 V2 路线标记为已发布。

开发仅在 `codex/e23-phase1-gps-map-fix` 分支进行。版本显示为 `Phase 1.4 Codex GPS Map Fix`，并显示构建提交短 SHA。

## 2. 已核实的基线问题

1. `RunPage` 在等待 GPS 阶段调用 `GpsRun.startRun()`，原生插件立即创建 SQLite 活动。
2. 强制开始会停止预定位活动，倒计时后再次创建活动，存在垃圾活动、重复记录和 ID 不一致风险。
3. 原生插件已经发送 `locationUpdate`，React 只订阅 `statsUpdate` 和 `serviceStateChange`，因此 `geoTrail` 始终为空。
4. 上传时使用空的 `geoTrail`，无法形成原生 SQLite 到后端 `trackPoints` 的完整链路。
5. 当前跑步地图是占位框，没有实际地图、当前位置、精度圆或轨迹线。
6. 插件没有完成精确定位权限请求和 GPS 系统开关的显式检查。
7. NETWORK_PROVIDER 和 PASSIVE_PROVIDER 的点可能进入正式里程；速度阈值常量没有参与过滤。
8. SQLite 轨迹点缺少 provider、计算速度、单点距离增量和风险标记。
9. React 生成的 `nativeClientId` 与原生 SQLite 活动 ID 不一致。
10. 恢复流程只把页面设为 running，没有恢复活动 ID、完整轨迹、计数、模式或可选择的恢复操作。
11. `screenOff` 和 `appBackgrounded` 诊断字段没有真实状态来源。
12. 在没有真机 logcat 前，不能把 GPS 距离为零唯一归因于精度阈值。

## 3. 总体架构

采用“原生状态机负责采集和权威数据，React 会话控制器负责界面和上传，地图适配层只负责渲染”的三层结构。

### 3.1 Android原生层

- `GpsRunPlugin`：权限、GPS 开关、预定位、正式开始、暂停、恢复、结束、放弃和诊断的 Capacitor 边界。
- `GpsRunService`：Foreground Service 生命周期、预定位和正式跑步状态机、GPS 回调、通知与锁屏持续采集。
- `GpsPointEvaluator`：无 Android UI 依赖的点质量判断和距离算法，可由 JUnit 直接测试。
- `RunDatabaseHelper`：活动与所有原始轨迹点的本地持久化、恢复和审计查询。

### 3.2 React层

- `runSession`：纯状态转换、目标规则、轨迹事件归并和诊断计数。
- `nativeGpsPlugin`：强类型原生 API 与事件契约。
- `useRunSession`：订阅原生事件、加载恢复数据、结束后读取完整轨迹并交给本地记录或上传。
- `RunPage`：模式切换、预定位确认、跑中数据、恢复选择和跑后总结，不直接承载地图引擎。

### 3.3 地图层

- `maps/types.ts`：地图适配器、轨迹点、视口和错误事件的统一接口。
- `maps/leafletMap.ts`：Leaflet 实现，使用 OpenStreetMap 标准在线瓦片作为开发测试底图。
- `RunMap.tsx`：跑前、跑中、跑后三种展示模式，负责适配器生命周期和错误状态。

地图失败只改变地图区域的状态，不停止原生 GPS、不清空轨迹、不阻断结束保存。OSM 不做批量预取或离线抓取，页面显示来源署名；中国大陆正式版本仍可通过同一接口替换为经批准的高德或其他地图服务。

## 4. 原生状态机

运行状态定义为：

`IDLE -> PREPARING -> RUNNING <-> PAUSED -> FINISHED`

活动放弃时进入 `ABANDONED`，保留 SQLite 活动和轨迹用于审计。

### 4.1 PREPARING

1. React 调用 `checkOutdoorReadiness()`。
2. 插件确认精确定位权限，必要时发起系统权限请求。
3. 插件检查 GPS_PROVIDER 是否开启。
4. React 调用 `prepareOutdoorRun()`。
5. Service 进入 PREPARING，启动通知、WakeLock 和定位，但不创建 SQLite 活动。
6. 位置事件仍回传给 React，用于当前位置、精度圆和信号等级。
7. 用户取消时调用 `cancelPreparation()`，停止定位和前台服务，不产生活动记录。

### 4.2 正式开始

1. 有首个有效点后，用户确认开始；弱信号强制开始也走同一个入口。
2. React 显示 3 秒倒计时。
3. 倒计时结束调用一次 `startRun()`。
4. 原生创建唯一 SQLite 活动并返回 `clientActivityId`。
5. Service 从 PREPARING 原地转为 RUNNING，不停止和重启定位。
6. 最近预定位点可作为基准点，但不累计倒计时前的距离。

`startRun()`必须具备幂等保护：PREPARING 只允许提升一次；RUNNING 状态再次调用返回现有活动，不创建第二条记录。

## 5. GPS质量与距离算法

阈值集中在 `GpsQualityConfig`：

- 首点精度上限：100米。
- 正式点精度上限：50米。
- 重复点阈值：0.5米。
- 正常跑步速度上限：8m/s。
- 可疑速度上限：12m/s。

规则如下：

1. 坐标和时间必须为有限、合法且时间严格递增的数据。
2. 模拟定位拒绝进入正式距离，但原始点仍保存。
3. GPS_PROVIDER 是唯一可计入正式里程的 provider。
4. NETWORK_PROVIDER 只用于辅助显示和预定位，不累计正式里程。
5. PASSIVE_PROVIDER 不累计正式里程。
6. 首个满足精度要求的 GPS 点只建立基准，不累计距离。
7. 后续点先计算 Haversine 距离和基于设备时间的相邻速度。
8. 小于0.5米的点标记为重复，不累计。
9. 不超过8m/s的有效点正常累计。
10. 8–12m/s的点标记为可疑风险，但保留为候选并累计；活动摘要显示风险点数量。
11. 超过12m/s的点拒绝累计。

每个回调点无论是否接受，都写入 SQLite 并发送 `locationUpdate`，保存：provider、accuracy、accepted、rejectionReason、calculatedSpeed、distanceDelta、timestamp、mockLocation 和 riskFlag。

## 6. SQLite与恢复

SQLite 只做向前兼容的本地增量升级，不删除或覆盖已有活动和轨迹。新增列通过 `ALTER TABLE` 在 `onUpgrade` 中建立；升级失败必须保留原始数据库并报告诊断错误。

恢复流程：

1. 启动时查找 RUNNING 或 PAUSED 活动。
2. 原生读取活动摘要、最后一个有效 GPS 点、有效/拒绝/风险计数和全部轨迹。
3. 原活动若处于 RUNNING，恢复界面先以 PAUSED 呈现，避免用户不知情地继续计时。
4. React 恢复活动 ID、距离、时长、模式、计数和轨迹，并重建地图。
5. 用户可选择继续、结束并保存或放弃。
6. 放弃只把活动标记为 ABANDONED，不删除 SQLite 轨迹。

## 7. 原生到React数据链路

每个位置回调的链路固定为：

`LocationManager -> GpsPointEvaluator -> SQLite -> locationUpdate -> useRunSession -> geoTrail -> RunMap`

结束或恢复时，以 SQLite 完整轨迹为权威来源重新读取，而不是仅依赖内存中的事件数组。上传使用同一份已接受 GPS 轨迹，确保地图有线时上传不为空。

诊断字段至少包括：

- `nativeLocationCallbackCount`
- `locationAcceptedCount`
- `locationRejectedCount`
- `lastRejectionReason`
- `sqliteTrackPointCount`
- `nativeTotalDistanceM`
- `statsEventCount`
- `locationEventCount`
- `geoTrailLength`
- `mapRenderedPointCount`
- `uploadedTrackPointCount`
- 当前 provider、精度、GPS 开关、权限和前后台/锁屏状态

## 8. 地图行为

### 跑前

- 显示最近位置、精度圆、GPS 信号和重新定位按钮。
- 首次有效位置自动居中。

### 跑中

- 显示当前跑者位置和持续增长的真实轨迹线。
- 默认跟随当前位置，用户拖动地图后可关闭跟随，再通过按钮恢复。
- 支持地图视图与数据视图切换。

### 跑后

- 使用 SQLite 完整轨迹显示起点、终点和轨迹线。
- 自动缩放到完整轨迹范围。
- 显示有效点、拒绝点和风险点数量。

地图瓦片加载失败时显示“地图暂时无法加载，GPS仍在记录”，保留轨迹数据和全部跑步控制。

## 9. 户外跑、室内跑与目标

页面顶部始终显示户外跑和室内跑，由用户手动选择。

室内跑不检查定位权限、不调用任何 GpsRun 启动方法、不显示GPS轨迹。只计时，结束时填写跑步机距离，数据来源固定为 `INDOOR_MANUAL_DISTANCE`。

目标支持无目标、距离、时长、热量、快捷值、自定义值和清除。目标只存在本次内存会话，不写 localStorage；下一次进入默认 NONE。目标达成仅提示，不自动结束。热量始终标为估算值；没有体重数据时显示估算误差提示。

## 10. 测试设计

新增前端行为测试和 Android JUnit，不用旧有103项静态断言代替新测试。至少覆盖：

1. 户外/室内切换。
2. 室内跑不调用GPS。
3. 户外跑进入预定位。
4. 等待GPS不创建活动。
5. 强制开始不重复创建活动。
6. 首点不计距离。
7. 后续有效点计距离。
8. 低精度点拒绝。
9. NETWORK_PROVIDER不累计。
10. PASSIVE_PROVIDER不累计。
11. 8–12m/s标记风险。
12. 超过12m/s拒绝。
13. locationUpdate进入geoTrail。
14. geoTrail驱动地图。
15. 跑后从SQLite保留完整轨迹。
16. 异常恢复重建轨迹。
17. 地图失败不影响GPS会话。
18. 清除目标后为NONE且值归零。
19. 下一次不继承目标。
20. 放弃活动保留审计轨迹。

## 11. 构建与交付

本地及CI执行：

1. `npm ci`
2. `npx tsc -b`
3. `npm run lint`
4. `npm run test:unit`
5. `npm run build`
6. `npx cap sync android`
7. `gradlew clean`
8. `gradlew testDebugUnitTest`
9. `gradlew assembleDebug`
10. `apksigner verify`
11. 生成 SHA256

新增独立的 Codex Phase 1.4 Android workflow，只触发 `codex/e23-phase1-gps-map-fix` 或手工运行，不改动 Kimi 和主线工作流的触发边界。Artifact 和 APK 名称明确包含 Phase 1.4 Codex GPS Map Fix。

## 12. 验收与事实口径

自动测试和APK构建只能证明代码、桥接和安装包通过。真机GPS回调、实际走动200米、锁屏5分钟和后台持续定位必须由连接的真实Android设备完成。

如果当前环境没有可操作真机，最终结论必须写：

“代码和自动构建通过，真机GPS和锁屏测试待用户验收。”

在没有真机证据前，不得表述为“GPS已修复”“锁屏已通过”或“Phase 1.4全部完成”。
