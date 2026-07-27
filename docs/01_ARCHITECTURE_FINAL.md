# E23跑起来 · 技术架构（Codex最终评审版）

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    PWA (React)                       │
│  LoginPage → AuthPage → RunPage → ProfilePage        │
│  RunMap (Leaflet/OSM) │ GpsTestCenter │ GoalEditor   │
└────────┬────────────────────────────┬───────────────┘
         │ Capacitor Bridge           │ Supabase JS Client
    ┌────┴────┐                 ┌──────┴──────┐
    │ Android  │                 │  Supabase    │
    │ Native   │                 │  Cloud       │
    └────┬────┘                 └──────┬──────┘
         │                            │
    ┌────┴────────────┐        ┌──────┴──────────┐
    │ GpsRunPlugin    │        │  PostgreSQL      │
    │ GpsRunService   │        │  Auth            │
    │ RunDatabaseHelper│       │  Realtime        │
    │ SQLite (local)  │        │  RLS             │
    └─────────────────┘        └─────────────────┘
```

## 前端技术栈

| 层 | 技术选型 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 7 |
| PWA | vite-plugin-pwa |
| 状态管理 | Store 类（观察者模式）+ useSyncExternalStore |
| 地图 | Leaflet + OpenStreetMap |
| 云端客户端 | @supabase/supabase-js |
| 原生桥接 | @capacitor/core |

## Android 技术栈

| 层 | 技术选型 |
|---|---|
| 容器 | Capacitor 8 |
| GPS定位 | LocationManager（GPS_PROVIDER + NETWORK） |
| 后台服务 | Foreground Service（type=location） |
| 本地数据库 | Android SQLite（e23_run.db） |
| 插件 | GpsRunPlugin（8+ JS接口） |

## 云端技术栈

| 服务 | 产品 |
|---|---|
| 认证 | Supabase Auth（邮箱+密码） |
| 数据库 | Supabase PostgreSQL（RLS + Triggers） |
| 实时 | Supabase Realtime（Postgres Changes） |
| 部署 | Vercel / CloudBase（待定） |

## 数据流

```
用户登录 (Supabase Auth)
    ↓
profiles 表（昵称/角色/班级）
    ↓
run_activities 表（跑步活动摘要）
    ↓
class_stats 表（Trigger自动更新班级汇总）
    ↓
route_progress 表（Trigger自动更新路线进度）
```

## 关键设计决策

1. **双数据源：** 本地SQLite + 云端PostgreSQL，本地优先写入，云端异步同步
2. **权重验证：** 手动补录需要审批，GPS数据标记valid
3. **RLS隔离：** 用户只能读写自己的数据，班级统计通过Trigger聚合
4. **client_id幂等：** 避免重复同步
