# E23跑起来 · 交接文档（Codex最终评审版）

## 项目目录结构

```
repo/
├── src/
│   ├── pages/           # 页面组件
│   │   ├── RunPage.tsx       # 跑步主页（户外/室内/目标）
│   │   ├── ProfilePage.tsx   # 个人中心
│   │   ├── LoginPage.tsx     # 登录（测试+Supabase）
│   │   ├── GpsTestCenter.tsx # GPS三层诊断
│   │   └── ...
│   ├── components/      # 通用组件
│   │   ├── RunMap.tsx         # Leaflet地图
│   │   ├── LiveGpsDiagnostics.tsx  # 实时GPS诊断
│   │   ├── DiagnosticPanel.tsx     # 诊断面板
│   │   └── ...
│   ├── lib/
│   │   ├── store.ts           # 全局状态管理
│   │   ├── supabase.ts        # Supabase客户端
│   │   └── integrations.ts    # 地图包
│   ├── repositories/
│   │   └── CloudRepository.ts # 云端CRUD
│   ├── services/
│   │   └── auth/index.ts      # Auth服务
│   ├── run/
│   │   ├── useRunSession.ts   # 跑步状态机
│   │   ├── nativeRunClient.ts # 原生桥接客户端
│   │   └── runSession.ts      # Session reducer
│   ├── providers/
│   │   └── nativeGpsPlugin.ts # GPS插件TS接口
│   ├── maps/
│   │   └── leafletMap.ts      # Leaflet适配器
│   └── api/
│       └── sync.ts            # 同步队列
├── android/
│   └── app/src/main/java/.../
│       ├── run/
│       │   ├── GpsRunService.java      # 前台定位Service
│       │   ├── GpsRunPlugin.java       # Capacitor插件
│       │   ├── RunDatabaseHelper.java  # SQLite(DB v3)
│       │   ├── GpsPointEvaluator.java  # GPS质量评估
│       │   └── RunState.java           # 数据模型
│       └── MainActivity.java           # 插件注册
├── backend/
│   ├── prisma/
│   │   └── schema.prisma    # 完整DB schema
│   ├── src/
│   │   ├── app.ts           # Express服务
│   │   └── routes/          # API路由
│   └── docker-compose.yml   # 部署配置
└── docs/                    # 本目录
```

## 环境变量

| 变量 | 当前值 |
|---|---|
| VITE_SUPABASE_URL | https://wakfdoszxaeytvkiugsh.supabase.co |
| VITE_SUPABASE_PUBLISHABLE_KEY | sb_publishable_fHV52q-... |
| VITE_MULTIPLAYER_ENABLED | true |
| VITE_TEST_SMS_CODE | 123456 |
| VITE_ANNUAL_GOAL_KM | 270 |
| VITE_MAP_PROVIDER | static-pack |

## 关键文件说明

| 文件 | 职责 | 需要注意 |
|---|---|---|
| store.ts | 全局状态 | 双数据源设计（本地+云端） |
| CloudRepository.ts | 云端操作 | 支持isolated/upsert |
| GpsRunService.java | GPS采集 | Foreground Service核心 |
| RunPage.tsx | 跑步交互 | 整合了Codex + WorkBuddy成果 |

## 交接要点

> **当前状态：真实多人系统底座完成，业务闭环待Phase 2.1D验收**

1. **Supabase项目已创建**但RLS策略和Trigger需要管理员修正才能打通写入流程
2. **后端代码已就绪**但未部署（backend/目录）
3. **Android GPS前台Service已实现**但真机锁屏和首点获取需要最终验收
4. **云端写入当前被阻挡**：RLS（class_members）+ Trigger（class_stats依赖class_id）
5. **测试账号可用**：test_a@e23.com / test_b@e23.com

## 已完成清单

### 项目基础
- React/Vite/TS/PWA
- 跑步基础流程
- Android GPS测试中心（三层诊断）
- SQLite user_id隔离

### 云端基础
- Supabase Project
- Auth代码（邮箱+密码注册登录）
- profiles模型
- RLS框架
- Trigger框架
- class_stats设计
- route_progress设计

### 安全
- 敏感字段保护（class_id/role/status禁止普通用户修改）
- admin RPC权限模型
- 本地数据隔离（SQLite + Outbox userId）

## 尚未最终闭环

| 项目 | 需要完成 |
|---|---|
| class_members正式写入流程 | 创建SECURITY DEFINER函数绕开RLS |
| run_activities正式前端写入 | 修正RLS/Trigger链 |
| class_stats真实业务累计 | Trigger实际运行 |
| route_progress真实推进 | Trigger实际运行 |
| Realtime | 双浏览器测试 |
| sync_queue | 完整上传/重试/冲突逻辑 |
| PWA公网部署 | 多人测试前提 |
| iPhone Safari测试 | 设备测试 |
