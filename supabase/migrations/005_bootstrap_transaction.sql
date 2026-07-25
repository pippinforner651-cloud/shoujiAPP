-- E23跑起来 · Phase 2.1B 一次性 Bootstrap
-- 由 postgres (SQL Editor) 执行，单事务
-- 结束后 Trigger 自动恢复，普通用户仍不能修改敏感字段

BEGIN;

-- ============================================================
-- 1. 确认 A/B 在 auth.users 中存在
-- ============================================================
DO $$
DECLARE
  uid_a UUID; uid_b UUID; cid UUID; v_count INTEGER;
BEGIN
  SELECT id INTO uid_a FROM auth.users WHERE email = 'e23test.a@example.com' LIMIT 1;
  SELECT id INTO uid_b FROM auth.users WHERE email = 'e23test.b@example.com' LIMIT 1;
  SELECT id INTO cid FROM public.classes WHERE name = 'E23' LIMIT 1;

  RAISE NOTICE 'Auth check - A: %, B: %, Class: %', uid_a, uid_b, cid;

  -- 2. 补齐 profiles（如果不存在）
  IF uid_a IS NOT NULL THEN
    INSERT INTO public.profiles (id, nickname, role, status)
    VALUES (uid_a, '测试用户A', 'member', 'approved')
    ON CONFLICT (id) DO UPDATE SET nickname = '测试用户A';
  END IF;

  IF uid_b IS NOT NULL THEN
    INSERT INTO public.profiles (id, nickname, role, status)
    VALUES (uid_b, '测试用户B', 'member', 'approved')
    ON CONFLICT (id) DO UPDATE SET nickname = '测试用户B';
  END IF;

  -- 3. 临时禁用 profiles 敏感字段保护 Trigger，一次性更新 class_id
  ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_profile_fields;

  IF uid_a IS NOT NULL AND cid IS NOT NULL THEN
    UPDATE public.profiles SET class_id = cid WHERE id = uid_a;
    INSERT INTO public.class_members (class_id, user_id, role) VALUES (cid, uid_a, 'member') ON CONFLICT DO NOTHING;
  END IF;

  IF uid_b IS NOT NULL AND cid IS NOT NULL THEN
    UPDATE public.profiles SET class_id = cid WHERE id = uid_b;
    INSERT INTO public.class_members (class_id, user_id, role) VALUES (cid, uid_b, 'member') ON CONFLICT DO NOTHING;
  END IF;

  -- 立即重新启用 Trigger
  ALTER TABLE public.profiles ENABLE TRIGGER trg_protect_profile_fields;

  -- 4. 初始化 class_stats（基于已有 valid 活动）
  INSERT INTO public.class_stats (class_id, total_distance_m, total_duration_s, total_activities, active_members, updated_at)
  SELECT cid,
    COALESCE((SELECT SUM(distance_m) FROM public.run_activities WHERE class_id = cid AND status = 'valid'), 0),
    COALESCE((SELECT SUM(duration_s) FROM public.run_activities WHERE class_id = cid AND status = 'valid'), 0),
    COALESCE((SELECT COUNT(*) FROM public.run_activities WHERE class_id = cid AND status = 'valid'), 0),
    COALESCE((SELECT COUNT(DISTINCT user_id) FROM public.run_activities WHERE class_id = cid AND status = 'valid'), 0),
    NOW()
  ON CONFLICT (class_id) DO UPDATE SET
    total_distance_m = EXCLUDED.total_distance_m,
    total_duration_s = EXCLUDED.total_duration_s,
    total_activities = EXCLUDED.total_activities,
    active_members = EXCLUDED.active_members,
    updated_at = EXCLUDED.updated_at;

  -- 5. 初始化 route_progress
  INSERT INTO public.route_progress (class_id, current_city_index, completed_km, progress_pct, updated_at)
  SELECT cid, 0,
    ROUND(COALESCE((SELECT SUM(distance_m) FROM public.run_activities WHERE class_id = cid AND status = 'valid'), 0)::NUMERIC / 10000.0, 4),
    ROUND(COALESCE((SELECT SUM(distance_m) FROM public.run_activities WHERE class_id = cid AND status = 'valid'), 0)::NUMERIC / 10000.0 / 27000.0 * 100, 2),  -- 约 27,000 km
    NOW()
  ON CONFLICT (class_id) DO UPDATE SET
    completed_km = EXCLUDED.completed_km,
    progress_pct = EXCLUDED.progress_pct,
    updated_at = EXCLUDED.updated_at;

  -- 6. 验证 Trigger 已重新启用
  SELECT COUNT(*) INTO v_count
  FROM pg_trigger
  WHERE tgrelid = 'public.profiles'::regclass
    AND tgname = 'trg_protect_profile_fields'
    AND tgenabled = 'O';

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Trigger trg_protect_profile_fields was NOT re-enabled!';
  END IF;

  RAISE NOTICE 'Trigger trg_protect_profile_fields is ENABLED (O) — OK';
  RAISE NOTICE 'Bootstrap complete';
END;
$$;

COMMIT;

-- ============================================================
-- 7. 最终确认
-- ============================================================
SELECT 'class_stats' as tbl, * FROM public.class_stats;
SELECT 'route_progress' as tbl, * FROM public.route_progress;
SELECT 'class_members' as tbl, count(*)::int as cnt FROM public.class_members;
SELECT 'profiles' as tbl, id, nickname, class_id, role, status FROM public.profiles;
SELECT 'trigger_status' as tbl, tgenabled FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'trg_protect_profile_fields';
