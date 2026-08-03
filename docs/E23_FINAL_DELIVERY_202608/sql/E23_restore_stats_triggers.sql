-- ============================================================================
-- E23跑起来 · 聚合统计恢复脚本（幂等，可重复执行）
-- 文件：E23_restore_stats_triggers.sql
-- 用途：恢复数据库恢复后缺失的聚合函数与触发器，并对现有 run_activities
--       执行一次全量回算（以 run_activities 为唯一事实源，非增量累加）。
--
-- 执行位置：Supabase Dashboard → SQL Editor（postgres / service_role 权限）
-- 前置要求：classes / run_activities / user_stats / class_stats / route_progress
--           表结构已存在（本脚本不建表、不删表、不清空业务数据）。
--
-- 幂等性：CREATE OR REPLACE FUNCTION / DROP TRIGGER IF EXISTS + CREATE TRIGGER
--         / INSERT ... ON CONFLICT DO UPDATE，可重复执行。
--
-- 口径（与原始 migration 003/006 完全一致）：
--   1. 只统计 status = 'valid' 的活动
--   2. class_stats  = 按 class_id 全量 SUM(distance_m)、SUM(duration_s)、
--                     COUNT(*)、COUNT(DISTINCT user_id)
--   3. route_progress = completed_km = total_m / 10000.0（1:10 比例）
--                       progress_pct = completed_km / 27000 * 100（约27,000km目标）
--   4. user_stats（新增触发器，口径同 class_stats 按 user 维度）：
--      全量 SUM / COUNT + last_activity_date = MAX(end_time)::date
--
-- SECURITY DEFINER：需要。class_stats / route_progress 的 RLS 策略
--   "only triggers can write class stats / route progress" 为 FOR ALL USING(false)，
--   普通 authenticated 用户无法直接写，触发器函数必须以表属主（postgres）身份
--   运行才能绕过 RLS 写入统计表。search_path 固定为 'public'。
-- ============================================================================


-- ============================================================================
-- 0. 前置校验：所需表/列必须存在，缺失则中止（避免执行一半）
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'run_activities') THEN
    RAISE EXCEPTION 'table run_activities missing - run 001_create_all_tables.sql first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_stats') THEN
    RAISE EXCEPTION 'table user_stats missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'class_stats') THEN
    RAISE EXCEPTION 'table class_stats missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'route_progress') THEN
    RAISE EXCEPTION 'table route_progress missing';
  END IF;
  RAISE NOTICE 'pre-flight check OK';
END;
$$;


-- ============================================================================
-- 1. 恢复 class_stats + route_progress 聚合函数（原始定义，来自 migration
--    003_team_stats_trigger.sql + 006_route_target_27000.sql，27000km 版本）
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_class_stats_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_id UUID;
  total_m BIGINT;
  total_s BIGINT;
  total_acts INT;
  total_members INT;
  e23_total_km NUMERIC;
  progress_km NUMERIC;
BEGIN
  -- 确定受影响的班级
  IF TG_OP = 'DELETE' THEN target_id := OLD.class_id;
  ELSE target_id := NEW.class_id;
  END IF;

  -- 重算 class_stats（全量 SUM，防重复累计）
  SELECT COALESCE(SUM(distance_m),0)::BIGINT,
         COALESCE(SUM(duration_s),0)::BIGINT,
         COUNT(*)::INT,
         COUNT(DISTINCT user_id)::INT
  INTO total_m, total_s, total_acts, total_members
  FROM public.run_activities
  WHERE class_id = target_id AND status = 'valid';

  -- UPSERT class_stats
  INSERT INTO public.class_stats (class_id, total_distance_m, total_duration_s, total_activities, active_members, updated_at)
  VALUES (target_id, total_m, total_s, total_acts, total_members, NOW())
  ON CONFLICT (class_id) DO UPDATE SET
    total_distance_m = EXCLUDED.total_distance_m,
    total_duration_s = EXCLUDED.total_duration_s,
    total_activities = EXCLUDED.total_activities,
    active_members = EXCLUDED.active_members,
    updated_at = EXCLUDED.updated_at;

  -- 计算 route_progress
  SELECT total_route_km INTO e23_total_km FROM public.classes WHERE id = target_id;
  e23_total_km := COALESCE(e23_total_km, 27000);  -- 约 27,000 km（E23 V2 目标）
  progress_km := ROUND(total_m::NUMERIC / 10000.0, 4); -- 1:10 比例

  INSERT INTO public.route_progress (class_id, current_city_index, completed_km, progress_pct, updated_at)
  VALUES (target_id, 0, progress_km, ROUND((progress_km / e23_total_km * 100)::NUMERIC, 2), NOW())
  ON CONFLICT (class_id) DO UPDATE SET
    completed_km = EXCLUDED.completed_km,
    progress_pct = EXCLUDED.progress_pct,
    updated_at = EXCLUDED.updated_at;

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ============================================================================
-- 2. 恢复 class_stats/route_progress 触发器（幂等）
-- ============================================================================
DROP TRIGGER IF EXISTS trg_update_class_stats ON public.run_activities;
CREATE TRIGGER trg_update_class_stats
  AFTER INSERT OR UPDATE OR DELETE
  ON public.run_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_class_stats_fn();


-- ============================================================================
-- 3. 新增 user_stats 聚合函数 + 触发器
--    注意：原始 migration（001-006）未包含 user_stats 触发器；
--    本函数沿用与 class_stats 完全相同的口径（status='valid' 全量重算），
--    仅维度改为 user_id。这是对原始设计的补充实现，非新统计模型。
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_user_stats_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_user UUID;
  v_cnt INT;
BEGIN
  IF TG_OP = 'DELETE' THEN target_user := OLD.user_id;
  ELSE target_user := NEW.user_id;
  END IF;

  -- 全量重算该用户（防重复累计）
  SELECT COUNT(*) INTO v_cnt
  FROM public.run_activities
  WHERE user_id = target_user AND status = 'valid';

  IF v_cnt = 0 THEN
    -- 无有效活动：写 0（保持行存在，且不残留旧值）
    INSERT INTO public.user_stats (user_id, total_distance_m, total_duration_s, total_activities, last_activity_date, updated_at)
    VALUES (target_user, 0, 0, 0, NULL, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      total_distance_m = 0,
      total_duration_s = 0,
      total_activities = 0,
      last_activity_date = NULL,
      updated_at = NOW();
  ELSE
    INSERT INTO public.user_stats (user_id, total_distance_m, total_duration_s, total_activities, last_activity_date, updated_at)
    SELECT ra.user_id,
           COALESCE(SUM(ra.distance_m),0)::INT,
           COALESCE(SUM(ra.duration_s),0)::INT,
           COUNT(*)::INT,
           MAX(ra.end_time)::date,
           NOW()
    FROM public.run_activities ra
    WHERE ra.user_id = target_user AND ra.status = 'valid'
    GROUP BY ra.user_id
    ON CONFLICT (user_id) DO UPDATE SET
      total_distance_m = EXCLUDED.total_distance_m,
      total_duration_s = EXCLUDED.total_duration_s,
      total_activities = EXCLUDED.total_activities,
      last_activity_date = EXCLUDED.last_activity_date,
      updated_at = NOW();
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_user_stats ON public.run_activities;
CREATE TRIGGER trg_update_user_stats
  AFTER INSERT OR UPDATE OR DELETE
  ON public.run_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats_fn();


-- ============================================================================
-- 4. 历史数据全量回算（以 run_activities 为事实源，幂等，可重复执行；
--    使用"重新汇总"而非"继续相加"，不会重复累计）
-- ============================================================================

-- 4.1 user_stats 全量重算
INSERT INTO public.user_stats (user_id, total_distance_m, total_duration_s, total_activities, last_activity_date, updated_at)
SELECT ra.user_id,
       COALESCE(SUM(ra.distance_m),0)::INT,
       COALESCE(SUM(ra.duration_s),0)::INT,
       COUNT(*)::INT,
       MAX(ra.end_time)::date,
       NOW()
FROM public.run_activities ra
WHERE ra.status = 'valid'
GROUP BY ra.user_id
ON CONFLICT (user_id) DO UPDATE SET
  total_distance_m = EXCLUDED.total_distance_m,
  total_duration_s = EXCLUDED.total_duration_s,
  total_activities = EXCLUDED.total_activities,
  last_activity_date = EXCLUDED.last_activity_date,
  updated_at = NOW();

-- 4.1b 清理：删除"无任何有效活动"用户的统计行（保证重算语义，非清业务数据）
DELETE FROM public.user_stats us
WHERE NOT EXISTS (
  SELECT 1 FROM public.run_activities ra
  WHERE ra.user_id = us.user_id AND ra.status = 'valid'
);

-- 4.2 class_stats 全量重算
INSERT INTO public.class_stats (class_id, total_distance_m, total_duration_s, total_activities, active_members, updated_at)
SELECT ra.class_id,
       COALESCE(SUM(ra.distance_m),0)::INT,
       COALESCE(SUM(ra.duration_s),0)::INT,
       COUNT(*)::INT,
       COUNT(DISTINCT ra.user_id)::INT,
       NOW()
FROM public.run_activities ra
WHERE ra.status = 'valid' AND ra.class_id IS NOT NULL
GROUP BY ra.class_id
ON CONFLICT (class_id) DO UPDATE SET
  total_distance_m = EXCLUDED.total_distance_m,
  total_duration_s = EXCLUDED.total_duration_s,
  total_activities = EXCLUDED.total_activities,
  active_members = EXCLUDED.active_members,
  updated_at = NOW();

-- 4.3 route_progress 全量重算（约27,000km 目标，1:10 比例）
INSERT INTO public.route_progress (class_id, current_city_index, completed_km, progress_pct, updated_at)
SELECT ra.class_id, 0,
       ROUND(COALESCE(SUM(ra.distance_m),0)::NUMERIC / 10000.0, 4),
       ROUND(ROUND(COALESCE(SUM(ra.distance_m),0)::NUMERIC / 10000.0, 4) / 27000.0 * 100, 2),
       NOW()
FROM public.run_activities ra
WHERE ra.status = 'valid' AND ra.class_id IS NOT NULL
GROUP BY ra.class_id
ON CONFLICT (class_id) DO UPDATE SET
  completed_km = EXCLUDED.completed_km,
  progress_pct = EXCLUDED.progress_pct,
  updated_at = NOW();


-- ============================================================================
-- 5. 可选：恢复 admin_add_class_member()（SECURITY DEFINER，管理员加入成员）
--    原定义来自 004_security_audit.sql。非统计触发器，仅当需要班级成员管理
--    功能时取消下方注释执行。
-- ============================================================================
-- CREATE OR REPLACE FUNCTION public.admin_add_class_member(p_user_id UUID, p_class_id UUID, p_role TEXT DEFAULT 'member')
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = 'public'
-- AS $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
--   ) THEN
--     RAISE EXCEPTION 'admin_required';
--   END IF;
--   INSERT INTO public.class_members (class_id, user_id, role)
--   VALUES (p_class_id, p_user_id, p_role)
--   ON CONFLICT (class_id, user_id) DO NOTHING;
--   UPDATE public.profiles SET class_id = p_class_id WHERE id = p_user_id;
-- END;
-- $$;
-- REVOKE ALL ON FUNCTION public.admin_add_class_member(UUID, UUID, TEXT) FROM PUBLIC;
-- REVOKE ALL ON FUNCTION public.admin_add_class_member(UUID, UUID, TEXT) FROM anon;
-- GRANT EXECUTE ON FUNCTION public.admin_add_class_member(UUID, UUID, TEXT) TO authenticated;
