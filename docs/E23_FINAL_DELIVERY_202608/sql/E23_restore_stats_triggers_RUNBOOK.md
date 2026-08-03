# E23 聚合统计恢复 · 管理员执行手册（RUNBOOK）

**SQL 文件：** `sql/E23_restore_stats_triggers.sql`
**执行人：** Supabase 项目管理员（postgres / service_role 权限）
**预估耗时：** < 1 分钟（数据量小）

---

## 1. 打开 SQL Editor

1. 登录 Supabase Dashboard：https://supabase.com/dashboard
2. 选择项目：`wakfdoszxaeytvkiugsh`
3. 左侧菜单 → **SQL Editor** → **New query**

## 2. 执行前检查（Copy-Paste 到 SQL Editor 运行）

```sql
-- ① 确认业务表存在且结构正确
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('run_activities','user_stats','class_stats','route_progress');

-- ② 确认 run_activities 现有数据（执行后数量不得变化）
SELECT COUNT(*) AS activity_count,
       COUNT(*) FILTER (WHERE status = 'valid') AS valid_count
FROM public.run_activities;

-- ③ 确认缺失对象（应各返回 0 行 → 确认为缺失状态）
SELECT proname FROM pg_proc WHERE proname IN ('update_class_stats_fn','update_user_stats_fn');
SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.run_activities'::regclass
  AND tgname IN ('trg_update_class_stats','trg_update_user_stats');

-- ④ 确认 E23 班级与目标
SELECT id, name, total_route_km FROM public.classes WHERE name = 'E23';
-- 预期：id=94728c9e-9a66-485f-ae9e-12c4da074bb2, total_route_km=27000
```

## 3. 执行恢复 SQL

1. 打开 `E23_restore_stats_triggers.sql`，**全选复制全部内容**
2. 粘贴到 SQL Editor
3. 点击 **Run**

> 脚本幂等，可重复执行；中途出错不会留下半成品（函数/触发器均为 CREATE OR REPLACE / DROP IF EXISTS）。

## 4. 执行后验证

```sql
-- ① 函数存在
SELECT proname FROM pg_proc
WHERE proname IN ('update_class_stats_fn','update_user_stats_fn')
ORDER BY proname;
-- 预期：2 行

-- ② 触发器存在且启用
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'public.run_activities'::regclass
  AND tgname IN ('trg_update_class_stats','trg_update_user_stats');
-- 预期：2 行，tgenabled='O'

-- ③ user_stats 有 A/B 统计
SELECT user_id, total_distance_m, total_duration_s, total_activities
FROM public.user_stats ORDER BY user_id;

-- ④ class_stats 有 E23 总里程
SELECT class_id, total_distance_m, total_duration_s, total_activities, active_members
FROM public.class_stats;

-- ⑤ route_progress 有路线进度
SELECT class_id, completed_km, progress_pct FROM public.route_progress;
-- 预期口径：completed_km = SUM(distance_m)/10000（1:10）
--           progress_pct = completed_km/27000*100

-- ⑥ 现有 run_activities 数量未变化
SELECT COUNT(*) AS activity_count FROM public.run_activities;
-- 预期：与执行前 ② 相同

-- ⑦ RLS 隔离仍有效（用 test_b 的 token 查询 A 的数据应返回 0 行）
-- 在应用前端确认，或用 PostgREST：GET /rest/v1/run_activities?user_id=eq.<A的UUID>
```

## 5. 回滚方案

如发现异常需要回滚（统计表为派生数据，回滚不影响业务数据）：

```sql
-- ① 删除触发器（业务行为回到恢复前）
DROP TRIGGER IF EXISTS trg_update_class_stats ON public.run_activities;
DROP TRIGGER IF EXISTS trg_update_user_stats ON public.run_activities;

-- ② 可选：删除函数
DROP FUNCTION IF EXISTS public.update_class_stats_fn();
DROP FUNCTION IF EXISTS public.update_user_stats_fn();

-- ③ 可选：清空统计表（仅派生数据，不影响 run_activities/classes/profiles）
DELETE FROM public.user_stats;
DELETE FROM public.class_stats;
DELETE FROM public.route_progress;
```

> 注意：③ 会清空统计表内容。只在确认统计口径错误且需要完全重新开始时使用。

## 6. 预期结果（当前测试数据）

当前 run_activities 有效活动：
| client_id | 用户 | distance_m | status |
|---|---|---|---|
| ab20260803_a_1km_xxx | A | 1050 | valid |
| ab_round2_a_xxx | A | 1200 | valid |
| ab20260803_b_800m_xxx | B | 800 | valid |

预期统计：
- **user_stats A**：total_distance_m = 2250, total_activities = 2
- **user_stats B**：total_distance_m = 800, total_activities = 1
- **class_stats E23**：total_distance_m = 3050, active_members = 2, total_activities = 3
- **route_progress E23**：completed_km = 0.3050（3050m/10000，1:10），progress_pct = 0.3050/27000*100 ≈ 0.0011%

> 若管理员在验证 ③④⑤ 后新增/修改活动，触发器将自动实时更新统计。
