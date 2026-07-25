-- E23跑起来 · Migration 006: 路线目标更新 21423 → ~27000 km
-- 执行后：E23 V2 路线目标 = 约 27,000 km
-- V1 历史基线 21,423 km 保留在 Git 历史中

-- ============================================================
-- 1. 更新 classes 表默认值
-- ============================================================
ALTER TABLE public.classes ALTER COLUMN total_route_km SET DEFAULT 27000;

-- ============================================================
-- 2. 更新现有 E23 班级记录
-- ============================================================
UPDATE public.classes SET total_route_km = 27000 WHERE name = 'E23';

-- ============================================================
-- 3. 更新 Trigger 函数中的后备值
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
  IF TG_OP = 'DELETE' THEN target_id := OLD.class_id;
  ELSE target_id := NEW.class_id;
  END IF;

  SELECT COALESCE(SUM(distance_m),0)::BIGINT,
         COALESCE(SUM(duration_s),0)::BIGINT,
         COUNT(*)::INT,
         COUNT(DISTINCT user_id)::INT
  INTO total_m, total_s, total_acts, total_members
  FROM public.run_activities
  WHERE class_id = target_id AND status = 'valid';

  INSERT INTO public.class_stats (class_id, total_distance_m, total_duration_s, total_activities, active_members, updated_at)
  VALUES (target_id, total_m, total_s, total_acts, total_members, NOW())
  ON CONFLICT (class_id) DO UPDATE SET
    total_distance_m = EXCLUDED.total_distance_m,
    total_duration_s = EXCLUDED.total_duration_s,
    total_activities = EXCLUDED.total_activities,
    active_members = EXCLUDED.active_members,
    updated_at = EXCLUDED.updated_at;

  SELECT total_route_km INTO e23_total_km FROM public.classes WHERE id = target_id;
  e23_total_km := COALESCE(e23_total_km, 27000);
  progress_km := ROUND(total_m::NUMERIC / 10000.0, 4);

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
-- 4. 重新触发统计更新
-- ============================================================
UPDATE public.run_activities SET updated_at = NOW() WHERE status = 'valid';

-- ============================================================
-- 5. 确认更新结果
-- ============================================================
SELECT 'classes' as tbl, name, total_route_km FROM public.classes WHERE name = 'E23';
SELECT 'route_progress' as tbl, completed_km, progress_pct FROM public.route_progress;
