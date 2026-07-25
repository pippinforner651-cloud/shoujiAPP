-- E23跑起来 · Phase 2.1B 安全收口 + 受控初始化
-- 执行顺序：先 Run 全部 → 再验收

-- ============================================================
-- 1. 收紧 admin_add_class_member() — 增加管理员验证
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_add_class_member(p_user_id UUID, p_class_id UUID, p_role TEXT DEFAULT 'member')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  INSERT INTO public.class_members (class_id, user_id, role)
  VALUES (p_class_id, p_user_id, p_role)
  ON CONFLICT (class_id, user_id) DO NOTHING;

  UPDATE public.profiles SET class_id = p_class_id WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_add_class_member(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_add_class_member(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_add_class_member(UUID, UUID, TEXT) TO authenticated;

-- ============================================================
-- 2. 受控初始化（SQL Editor 作为 superuser 执行）
--   只有这一步能用直接 INSERT，之后普通用户无法自行加入
-- ============================================================
DO $$
DECLARE
  v_class_id UUID;
  v_user_a_id UUID;
  v_user_b_id UUID;
BEGIN
  SELECT id INTO v_class_id FROM public.classes WHERE name = 'E23' LIMIT 1;
  SELECT id INTO v_user_a_id FROM public.profiles WHERE nickname = '测试用户A' LIMIT 1;
  SELECT id INTO v_user_b_id FROM public.profiles WHERE nickname = '测试用户B' LIMIT 1;

  IF v_user_a_id IS NOT NULL AND v_class_id IS NOT NULL THEN
    INSERT INTO public.class_members (class_id, user_id, role) VALUES (v_class_id, v_user_a_id, 'member')
    ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET class_id = v_class_id WHERE id = v_user_a_id;
    RAISE NOTICE 'User A added to class: %', v_user_a_id;
  END IF;

  IF v_user_b_id IS NOT NULL AND v_class_id IS NOT NULL THEN
    INSERT INTO public.class_members (class_id, user_id, role) VALUES (v_class_id, v_user_b_id, 'member')
    ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET class_id = v_class_id WHERE id = v_user_b_id;
    RAISE NOTICE 'User B added to class: %', v_user_b_id;
  END IF;
END;
$$;

-- ============================================================
-- 3. 激活 Trigger：对已有活动触发生成统计
-- ============================================================
DO $$
DECLARE
  v_class_id UUID;
BEGIN
  SELECT id INTO v_class_id FROM public.classes WHERE name = 'E23' LIMIT 1;

  -- 触发 trigger 重新计算
  UPDATE public.run_activities SET updated_at = NOW() WHERE status = 'valid' AND class_id = v_class_id;

  -- 确保统计行存在
  INSERT INTO public.class_stats (class_id, total_distance_m, total_duration_s, total_activities, active_members, updated_at)
  SELECT v_class_id,
    COALESCE((SELECT SUM(distance_m) FROM public.run_activities WHERE class_id = v_class_id AND status = 'valid'), 0),
    COALESCE((SELECT SUM(duration_s) FROM public.run_activities WHERE class_id = v_class_id AND status = 'valid'), 0),
    COALESCE((SELECT COUNT(*) FROM public.run_activities WHERE class_id = v_class_id AND status = 'valid'), 0),
    COALESCE((SELECT COUNT(DISTINCT user_id) FROM public.run_activities WHERE class_id = v_class_id AND status = 'valid'), 0),
    NOW()
  ON CONFLICT (class_id) DO UPDATE SET
    total_distance_m = EXCLUDED.total_distance_m,
    total_duration_s = EXCLUDED.total_duration_s,
    total_activities = EXCLUDED.total_activities,
    active_members = EXCLUDED.active_members;

  INSERT INTO public.route_progress (class_id, current_city_index, completed_km, progress_pct, updated_at)
  SELECT v_class_id, 0,
    ROUND(COALESCE((SELECT SUM(distance_m) FROM public.run_activities WHERE class_id = v_class_id AND status = 'valid'), 0)::NUMERIC / 10000.0, 4),
    ROUND(COALESCE((SELECT SUM(distance_m) FROM public.run_activities WHERE class_id = v_class_id AND status = 'valid'), 0)::NUMERIC / 10000.0 / 21423.0 * 100, 2),
    NOW()
  ON CONFLICT (class_id) DO UPDATE SET
    completed_km = EXCLUDED.completed_km,
    progress_pct = EXCLUDED.progress_pct;
END;
$$;
