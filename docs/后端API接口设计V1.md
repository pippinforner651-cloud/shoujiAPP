# 后端 API 接口设计 V1

> **项目**：全民环游中国虚拟跑步地图  
> **版本**：V2.0 Phase 3.2  
> **日期**：2026-07-09  
> **Base URL**：`https://api.example.com/v1`

---

## 一、用户服务

### POST /users — 注册/创建用户

游客首次同步时调用，创建或更新用户记录。

**Request：**
```json
{
  "id": "guest_xxx_yyyy",
  "nickname": "跑者",
  "avatar": "default",
  "is_guest": true
}
```

**Response 201：**
```json
{
  "id": "guest_xxx_yyyy",
  "nickname": "跑者",
  "avatar": "default",
  "level": 1,
  "experience": 0,
  "is_guest": true
}
```

### GET /users/:id — 获取用户信息

**Response 200：**
```json
{
  "id": "cloud_xxx",
  "nickname": "跑步狂人",
  "avatar": "runner",
  "level": 5,
  "experience": 850,
  "is_guest": false,
  "total_distance_km": 1285.5,
  "run_count": 47,
  "created_at": "2026-01-15T08:00:00Z",
  "last_sync_at": "2026-07-09T10:00:00Z"
}
```

> `total_distance_km` 和 `run_count` 为**实时计算**值，由 `activities` 表 SUM/COUNT 得出

### PUT /users/:id — 更新用户信息

**Request：**
```json
{
  "nickname": "新昵称",
  "avatar": "cyclist"
}
```

---

## 二、运动记录服务

### POST /activities — 上传运动记录

**Request（单条）：**
```json
{
  "id": "run_xxx_yyyy",
  "user_id": "cloud_xxx",
  "source": "apple_health",
  "activity_type": "running",
  "distance_km": 8.2,
  "duration_sec": 2730,
  "pace_sec": 333,
  "calories": 520,
  "start_time": "2026-07-09T07:30:00Z",
  "gps_track": {
    "points": [
      {"latitude": 22.515, "longitude": 113.996, "timestamp": "2026-07-09T07:30:00Z", "altitude": 5}
    ]
  },
  "note": "晨跑 · 户外"
}
```

**Response 201：**
```json
{
  "id": "run_xxx_yyyy",
  "virtual_km": 82,
  "status": "created"
}
```

### POST /activities/batch — 批量上传

**Request：**
```json
{
  "user_id": "cloud_xxx",
  "activities": [
    { "...activity 1..." },
    { "...activity 2..." }
  ]
}
```

**Response 201：**
```json
{
  "uploaded": 2,
  "duplicates": 0,
  "total_virtual_km": 147
}
```

> **去重规则**：按 `activity.id` 主键冲突时忽略（幂等上传）

### GET /activities/user/:userId — 获取用户运动记录

**Query Parameters：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `since` | ISO date | 否 | 起始时间（含），默认全部 |
| `until` | ISO date | 否 | 结束时间 |
| `limit` | int | 否 | 条数限制，默认 50，最大 200 |
| `offset` | int | 否 | 分页偏移 |

**Response 200：**
```json
{
  "activities": [
    { "id": "run_xxx", "distance_km": 8.2, "start_time": "2026-07-09T07:30:00Z", ... }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

## 三、同步服务

### POST /sync — 全量同步

前端将本地数据推送至云端，同时获取云端增量数据。

**Request：**
```json
{
  "user_id": "cloud_xxx",
  "profile": {
    "nickname": "跑步狂人",
    "avatar": "runner",
    "level": 5,
    "experience": 850
  },
  "activities": [
    { "...本地新增记录..." }
  ],
  "last_sync_at": "2026-07-09T09:00:00Z"
}
```

**Response 200：**
```json
{
  "uploaded": 3,
  "downloaded": [
    { "...云端记录..." }
  ],
  "leaderboard": {
    "rank": 12,
    "total_participants": 100
  },
  "new_achievements": [
    { "id": "dist_100", "name": "百里跑者" }
  ],
  "server_time": "2026-07-09T10:00:00Z"
}
```

> `downloaded` 返回 `last_sync_at` 之后的所有云端记录
> `new_achievements` 返回本次同步新触发的成就

---

## 四、排行榜服务

### GET /leaderboard — 获取排行榜

**Query Parameters：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `limit` | int | 否 | 返回人数，默认 100 |
| `offset` | int | 否 | 分页偏移 |
| `user_id` | string | 否 | 返回该用户的排名 |

**Response 200：**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user_id": "cloud_001",
      "nickname": "跑步狂人",
      "avatar": "🏃",
      "total_distance_km": 1285.5,
      "run_count": 47,
      "current_city": "深圳"
    },
    {
      "rank": 2,
      "user_id": "cloud_002",
      "nickname": "风行者",
      "total_distance_km": 1102.3,
      ...
    }
  ],
  "total_participants": 100,
  "user_rank": {
    "rank": 42,
    "total_distance_km": 128.5
  }
}
```

> **`total_distance_km` 由 activities 表 SUM 实时计算，不单独存储**
> `user_rank` 仅在传入 `user_id` 时返回

---

## 五、接口总览

| 方法 | 路径 | 说明 | Mock 状态 |
|------|------|------|-----------|
| `POST` | `/users` | 注册用户 | ✅ |
| `GET` | `/users/:id` | 获取用户 | ✅ |
| `PUT` | `/users/:id` | 更新用户 | ✅ |
| `POST` | `/activities` | 上传单条记录 | ✅ |
| `POST` | `/activities/batch` | 批量上传 | ✅ |
| `GET` | `/activities/user/:userId` | 获取用户记录 | ✅ |
| `POST` | `/sync` | 全量同步 | ✅ |
| `GET` | `/leaderboard` | 排行榜 | ✅ |

---

## 六、数据一致性方案

### 6.1 核心规则

```
禁止在数据库中存储任何 "total" / "累计" 字段。
所有累计值 = 从 activities 表实时 SUM/COUNT 得出。
```

### 6.2 一致性校验（服务端）

每次查询 `GET /users/:id` 时自动执行：

```sql
-- 个人累计跑量
SELECT SUM(distance_km) FROM activities WHERE user_id = :userId;
-- 运行次数
SELECT COUNT(*) FROM activities WHERE user_id = :userId;
-- 排名
SELECT COUNT(*) + 1 FROM (
  SELECT user_id, SUM(distance_km) AS total
  FROM activities GROUP BY user_id
) AS rankings
WHERE total > (SELECT SUM(distance_km) FROM activities WHERE user_id = :userId);
```

### 6.3 一致性校验（前端）

`globalProgressStore` 中增加校验：

```typescript
// 前端下载排行榜后，校验自己的 totalDistanceKm 是否一致
const myTotal = useRunStore.getState().stats.totalDistanceKm;
const leaderboardTotal = leaderboard.find(u => u.user_id === myId)?.total_distance_km;
assert(Math.abs(myTotal - leaderboardTotal) < 0.01, '数据不一致');
```

### 6.4 数据流

```
Apple Watch ──→ 前端 runStore ──→ localStorage
                                  │
                              POST /sync
                                  │
                                  ▼
                        API Server /activities
                                  │
                          SUM GROUP BY user_id
                                  │
                                  ▼
                        GET /leaderboard → 前端 globalProgressStore
```

### 6.5 同步冲突处理

| 场景 | 策略 |
|------|------|
| 本地有、云端无 | 上传（create） |
| 云端有、本地无 | 下载（merge） |
| 两边都有 | 云端覆盖（云端较新） |
| ID 冲突 | 幂等忽略（主键冲突不更新） |

---

## 七、后续部署建议

### 7.1 技术栈建议

| 组件 | 推荐 | 说明 |
|------|------|------|
| 后端框架 | Node.js (Express/Fastify) | 与前端同语言，降低学习成本 |
| 数据库 | PostgreSQL 15+ | 支持 JSON 字段存 GPS 轨迹 |
| ORM | Prisma | TypeScript 原生支持 |
| 认证 | JWT + refresh token | 微信登录后接入 |
| 部署 | Docker + Railway/Render | 低成本 MVP 部署 |
| CDN | Cloudflare | 静态资源加速 |

### 7.2 部署架构

```
┌────────┐     ┌────────┐     ┌──────────┐
│ 前端    │────→│ API    │────→│ PostgreSQL│
│ (Vite)  │     │ (Node) │     │          │
└────────┘     └────────┘     └──────────┘
     │                             │
     ▼                             ▼
  Cloudflare                    Railway
  (CDN)                         (Hosting)
```

### 7.3 部署步骤

1. 创建 PostgreSQL 数据库，执行 `后端数据库设计V1.md` 中 DDL
2. 部署 Node.js API Server，配置环境变量 `DATABASE_URL`
3. 前端设置 `VITE_API_BASE_URL=https://api.example.com/v1`
4. 初始化成就种子数据（见 `achievements` 表 DDL）
5. 运行一致性测试套件
