-- ============================================================================
-- E23跑起来 · Migration 007: 路线换算规则纠偏 1:10 → 1:1
--
-- 【正式冻结规则】E23 V2 真实跑量与班级路线推进采用 1:1：
--   用户真实跑 1km = 班级路线前进 1km
--
-- 【历史错误】Migration 003/004/005/006 中 route_progress 使用
--   completed_km = total_m / 10000（即 1:10 比例），属于历史错误口径。
--   本 Migration 将其修正为：
--   completed_km = total_m / 1000.0（1:1 比例）
--   progress_pct  = completed_km / 27000.0 * 100（保持不变，约27,000km目标）
--
-- 【约束】不删除 run_activities / 不重置数据库 / 不改变 user_stats /
--         不改变 class_stats（两者口径本就正确）/ 只修正 route_progress。
-- 【幂等】CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS + CREATE TRIGGER
--         + 全量重算，可重复执行，不重复累计。
-- 【权限】SECURITY DEFINER（写 route_progress 表需绕过 RLS 的 FOR ALL USING(false)），
--         search_path 固定为 'public'。
-- ============================================================================


-- ============================================================================
-- 1. 修正聚合函数：completed_km 换算改为 1:1（total_m / 1000.0）
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
  -- ★ 纠偏：E23 V2 正式规则 1:1；旧 1:10（/10000）为历史错误口径，已废弃
  progress_km := ROUND(total_m::NUMERIC / 1000.0, 4);

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
-- 2. 重建触发器（幂等，覆盖 INSERT/UPDATE/DELETE）
-- ============================================================================
DROP TRIGGER IF EXISTS trg_update_class_stats ON public.run_activities;
CREATE TRIGGER trg_update_class_stats
  AFTER INSERT OR UPDATE OR DELETE
  ON public.run_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_class_stats_fn();

-- ============================================================================
-- 3. 对现有数据全量重算 route_progress（1:1，以 run_activities 为事实源）
-- ============================================================================
INSERT INTO public.route_progress (class_id, current_city_index, completed_km, progress_pct, updated_at)
SELECT ra.class_id, 0,
       ROUND(COALESCE(SUM(ra.distance_m),0)::NUMERIC / 1000.0, 4),
       ROUND(ROUND(COALESCE(SUM(ra.distance_m),0)::NUMERIC / 1000.0, 4) / 27000.0 * 100, 2),
       NOW()
FROM public.run_activities ra
WHERE ra.status = 'valid' AND ra.class_id IS NOT NULL
GROUP BY ra.class_id
ON CONFLICT (class_id) DO UPDATE SET
  completed_km = EXCLUDED.completed_km,
  progress_pct = EXCLUDED.progress_pct,
  updated_at = NOW();

-- ============================================================================
-- 4. 同步刷新 class_stats（口径未变，仅确保与既有活动一致，幂等）
-- ============================================================================
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

-- ============================================================================
-- 5. 验证查询（管理员执行后运行）
-- ============================================================================
-- SELECT 'class_stats' AS t, class_id, total_distance_m, total_activities FROM public.class_stats;
-- SELECT 'route_progress' AS t, class_id, completed_km, progress_pct FROM public.route_progress;
-- SELECT 'expect' AS t, 12800 AS class_total_m, ROUND(12800.0/1000.0,4) AS completed_km,
--        ROUND(ROUND(12800.0/1000.0,4)/27000.0*100,2) AS progress_pct;
