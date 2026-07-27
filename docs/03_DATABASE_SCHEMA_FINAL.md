# E23跑起来 · 数据库Schema（Codex最终评审版）

## Supabase PostgreSQL 表

### 1. profiles

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | 关联 auth.users.id |
| nickname | TEXT | 用户昵称 |
| real_name | TEXT? | 真实姓名 |
| phone | TEXT? | 手机号 |
| avatar_url | TEXT? | 头像URL |
| class_id | UUID? → classes.id | 所属班级 |
| role | TEXT | member / admin |
| status | TEXT | pending / approved / rejected |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

**权限：** RLS - 用户可读自己、管理员可写全部

### 2. classes

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| name | TEXT | 班级简称 (E23) |
| display_name | TEXT? | 展示名称 |
| total_route_km | NUMERIC | 路线总里程 |
| created_at | TIMESTAMPTZ | |

**权限：** 所有人可读

### 3. class_members

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| class_id | UUID FK → classes.id | |
| user_id | UUID FK → profiles.id | |
| role | TEXT | member / admin |
| created_at | TIMESTAMPTZ | |

**权限：** RLS - 当前RLS阻挡用户自加入

### 4. run_activities

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → profiles.id | 用户 |
| client_id | TEXT UNIQUE | 客户端幂等键 |
| class_id | UUID? | 班级（Trigger自动填充） |
| distance_m | NUMERIC | 距离（米） |
| duration_s | INT | 时长（秒） |
| avg_pace_sec | REAL? | 平均配速 |
| source | TEXT | gps / manual / joyrun |
| status | TEXT | pending / valid / rejected |
| started_at | TIMESTAMPTZ? | 开始时间 |
| ended_at | TIMESTAMPTZ? | 结束时间 |
| total_points | INT? | 轨迹点数 |
| rejected_points | INT? | 拒绝点数 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**权限：** RLS - 用户只读写自己的，Trigger汇总班级

### 5. run_track_points

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| activity_id | UUID FK → run_activities.id | |
| seq | INT | 序号 |
| lat | NUMERIC | 纬度 |
| lng | NUMERIC | 经度 |
| accuracy | NUMERIC | 精度 |
| provider | TEXT | gps / network |
| accepted | BOOLEAN | 是否接受 |
| rejection_reason | TEXT? | 拒绝原因 |
| created_at | TIMESTAMPTZ | |

**权限：** RLS - 用户只读写自己的

### 6. user_stats

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK UNIQUE | |
| total_distance_m | NUMERIC | 总距离 |
| total_duration_s | NUMERIC | 总时长 |
| activity_count | INT | 活动数 |
| updated_at | TIMESTAMPTZ | |

**权限：** 用户读自己，管理员读全部

### 7. class_stats

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| class_id | UUID FK UNIQUE | |
| total_distance_m | NUMERIC | 班级总距离 |
| total_duration_s | NUMERIC | 班级总时长 |
| active_users | INT | 活跃用户数 |
| updated_at | TIMESTAMPTZ | |

**权限：** 所有人可读

### 8. route_progress

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| class_id | UUID FK | |
| total_distance_m | NUMERIC | 总已跑距离 |
| route_total_km | NUMERIC | 路线总里程 |
| percentage | NUMERIC | 完成百分比 |
| updated_at | TIMESTAMPTZ | |

**权限：** 所有人可读

### 9. 其他表（功能预留）

| 表 | 用途 |
|---|---|
| route_unlocks | 里程碑解锁记录 |
| sync_queue | 离线同步队列 |
| audit_logs | 管理操作审计 |
| invite_codes | 邀请码（Phase 1 测试用） |
| external_connections | 第三方平台连接（悦跑圈等） |
| integration_states | 第三方接入状态（8级） |
| oauth_states | OAuth防重放票据 |

---

## Trigger 概述

`run_activities` 表上存在 Trigger：
- INSERT/UPDATE → 自动更新 `class_stats`（班级汇总）
- INSERT/UPDATE → 自动更新 `route_progress`（路线进度）
- 需要 `profiles.class_id` 非空才能正常工作

## 当前阻塞问题

1. `class_members` RLS 阻止用户自加入班级
2. `profiles.class_id` 不能由普通用户修改
3. 活动INSERT因class_stats trigger要求class_id而失败

**解决方案：** 创建 SECURITY DEFINER 函数或使用 service_role key。
