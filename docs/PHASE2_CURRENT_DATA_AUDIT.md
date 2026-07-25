# E23跑起来 · Phase 2 当前数据真相审计
## Current Data Audit

审计日期: 2026-07-25
审计范围: 代码层 + 存储层 + 网络层

---

## 15个关键问题答案

### Q1: 当前用户登录是真实账号系统还是本地模拟？

**本地模拟。** `LoginPage.tsx` 调用 `store.login(nick, phone)`，写入 `localStorage.setItem('e23_user_v1', ...)`。没有服务端验证，没有 JWT，没有 token 持久化。验证码为固定值 123456。

后端 `backend/` 目录存在（Prisma + Express），但 `VITE_API_BASE_URL` 为空，`isApiEnabled()` 返回 `false`，前后端未连接。

### Q2: 用户数据存在哪里？

**仅 localStorage。** 键名: `e23_user_v1`。`Store` 类在 `src/lib/store.ts` 中管理。

### Q3: 不同手机登录同一账号能否看到同样数据？

**不能。** 数据完全是本地的。换手机 = 空数据。没有任何云端同步机制。

### Q4: A用户和B用户的数据能否同时存在？

**不能。** 当前设计是单用户单机。`Store` 类只维护一个 `user` 对象。一台手机只能有一个登录态。

### Q5: 当前跑步记录存在哪里？

**仅 localStorage。** 键名 `e23_records_v1`。类型 `RunRecord[]`。

### Q6: SQLite属于谁？

**Android 原生 GPS 底层使用 SQLite (`RunDatabaseHelper.java`)**，仅用于存储 GPS 轨迹点（原始坐标、时间戳、质量标记）。不属于用户模型层。React 层完全不直接读 SQLite。

### Q7: localStorage保存了什么？

| Key | 内容 |
|-----|------|
| `e23_user_v1` | 用户资料 (nickname, phone, avatar) |
| `e23_records_v1` | 跑步记录数组 |
| `e23_mappack_v1` | 自定义地图包 |
| `e23_token_v1` | 后端 API token（当前为空） |

### Q8: 当前排行榜数据来源是什么？

**本机跑步记录排序。** `RankPage.tsx` 读取 `store.records`，按公里数降序排列。只有本机数据，没有其他用户数据。

当 `MULTIPLAYER_ENABLED = false` 时，清晰的"无其他学员数据"状态。参见 `config.ts`。

### Q9: 当前团队总公里数来源是什么？

**不真实。** 没有团队汇总。团队统计标记为 `MULTIPLAYER_ENABLED` 闸门保护，未启用。

### Q10: 当前地图路线进度来源是什么？

**本机个人跑量。** `MapPage.tsx` 读取 `store.records` 计算本机总公里数，映射到路线位置。

### Q11: 当前是否存在真实云端数据库？

**不存在。** Prisma schema 定义了 `User`, `RunActivity`, `TrackPoint`, `DailyStats`, `UserStats`, `ClassStats`, `RouteProgress`, `SyncQueue` 等模型，但数据库从未创建。`DATABASE_URL` 环境变量未配置。

### Q12: 当前是否存在真实API？

**不存在。** `src/api/client.ts` 定义了 `isApiEnabled()` 返回 `BASE.length > 0`。当前 `VITE_API_BASE_URL` 为空。

### Q13: 当前是否存在Realtime/WebSocket订阅？

**不存在。** 没有任何 Realtime、WebSocket 或 Server-Sent Events 实现。

### Q14: 两台手机同时跑步后是否会汇总？

**不会。** 数据完全独立存储。没有汇总机制。

### Q15: 换一台手机登录后是否丢数据？

**是。** 跑步记录完全绑定本机 localStorage。没有账号绑定，没有云端备份。

---

## 核心结论

| 问题 | 当前状态 | 是否多人 |
|------|----------|---------|
| 用户登录 | ✅ 本地模拟 (test authMode) | ❌ 单人 |
| 用户数据 | localStorage | ❌ 单机 |
| 跑步记录 | localStorage | ❌ 单机 |
| 排行榜 | 本机数据排序 | ❌ 单人 |
| 团队总公里 | 未启用 (MULTIPLAYER_ENABLED=false) | ❌ 无 |
| 地图进度 | 本机跑量映射 | ❌ 单人 |
| 城市解锁 | 本机 | ❌ 单人 |
| 云端数据库 | ❌ 未部署 | ❌ |
| API | ❌ 未连接 | ❌ |
| Realtime | ❌ | ❌ |
| 跨设备 | ❌ 换机丢数据 | ❌ |

**结论：当前是完全的单机系统，不是多人系统。**
