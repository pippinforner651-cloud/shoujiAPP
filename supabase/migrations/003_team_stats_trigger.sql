-- E23跑起来 · Phase 2.1B 团队统计自动更新触发器
-- 字段与 001_create_all_tables.sql 完全一致
-- ============================================================
-- 1. 创建/替换 SECURITY DEFINER 团队统计函数
-- ============================================================
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

  -- 重算class_stats（全量SUM，防重复累计）
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
  e23_total_km := COALESCE(e23_total_km, 21423);
  progress_km := ROUND(total_m::NUMERIC / 10000.0, 4); -- 1:10比例

  INSERT INTO public.route_progress (class_id, current_city_index, completed_km, progress_pct, updated_at)
  VALUES (target_id, 0, progress_km, ROUND((progress_km / e23_total_km * 100)::NUMERIC, 2), NOW())
  ON CONFLICT (class_id) DO UPDATE SET
    completed_km = EXCLUDED.completed_km,
    progress_pct = EXCLUDED.progress_pct,
    updated_at = EXCLUDED.updated_at;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- 2. 创建 Trigger（幂等）
-- ============================================================
DROP TRIGGER IF EXISTS trg_update_class_stats ON public.run_activities;
CREATE TRIGGER trg_update_class_stats
  AFTER INSERT OR UPDATE OR DELETE
  ON public.run_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_class_stats_fn();

-- ============================================================
-- 3. 确保初始 row 存在（避免 INSERT policy 阻塞）
-- ============================================================
INSERT INTO public.class_stats (class_id, total_distance_m, total_duration_s, total_activities, active_members, updated_at)
SELECT id, 0, 0, 0, 0, NOW()
FROM public.classes
ON CONFLICT (class_id) DO NOTHING;

INSERT INTO public.route_progress (class_id, current_city_index, completed_km, progress_pct, updated_at)
SELECT id, 0, 0, 0, NOW()
FROM public.classes
ON CONFLICT (class_id) DO NOTHING;

-- ============================================================
-- 4. 修复 class_members：创建 SECURITY DEFINER 函数供管理员添加成员
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_add_class_member(p_user_id UUID, p_class_id UUID, p_role TEXT DEFAULT 'member')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.class_members (class_id, user_id, role)
  VALUES (p_class_id, p_user_id, p_role)
  ON CONFLICT (class_id, user_id) DO NOTHING;
  -- 同时更新 profile 的 class_id
  UPDATE public.profiles SET class_id = p_class_id WHERE id = p_user_id;
END;
$$;
