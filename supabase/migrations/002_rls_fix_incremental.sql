-- E23跑起来 · Phase 2.1B 增量RLS/trigger修复
-- 在现有Migration基础上执行，不重建表

-- ============================================================
-- 1. 修复 user_class_id() 固定 search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_class_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT class_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- 2. 修复 user_stats 的 classmates policy（移除 class_members 依赖）
-- ============================================================
DROP POLICY IF EXISTS "classmates can read user stats" ON public.user_stats;
CREATE POLICY "classmates can read user stats"
  ON public.user_stats FOR SELECT
  TO authenticated
  USING (
    public.user_class_id() = (SELECT class_id FROM public.profiles WHERE id = user_stats.user_id)
  );

-- ============================================================
-- 3. profiles UPDATE 保护：禁止普通用户修改 class_id / role / status
-- ============================================================

-- 3a. 先拆分 UPDATE policy：保留行级过滤
DROP POLICY IF EXISTS "users can update own profile" ON public.profiles;
CREATE POLICY "users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3b. 创建 BEFORE UPDATE trigger function 保护敏感字段
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Get the user's current role from the database (not from NEW/OLD)
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  
  -- Admins can change anything
  IF v_role = 'admin' THEN
    RETURN NEW;
  END IF;
  
  -- Regular users: protect class_id
  IF NEW.class_id IS DISTINCT FROM OLD.class_id THEN
    RAISE EXCEPTION '普通用户不能修改 class_id';
  END IF;
  
  -- Regular users: protect role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION '普通用户不能修改 role';
  END IF;
  
  -- Regular users: protect status
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION '普通用户不能修改 status';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- ============================================================
-- 4. 验证：检查当前所有与 class_members 相关的 policy
-- ============================================================
-- 执行以下查询确认没有 policy 再直接引用 class_members 进行权限判断：
-- SELECT schemaname, tablename, policyname, pg_get_expr(polqual, polrelid)
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND pg_get_expr(polqual, polrelid) LIKE '%class_members%';
