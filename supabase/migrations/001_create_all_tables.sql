-- E23跑起来 · Phase 2.1 数据库迁移
-- 创建 11 张云端业务表，从第一版即启用 Row Level Security
-- 可重复执行（DROP POLICY IF EXISTS + CREATE TABLE IF NOT EXISTS）
--
-- 建表顺序（依赖关系）：
--   1. classes（无外部依赖）
--   2. profiles（依赖 classes.id）
--   3. class_members（依赖 classes.id, profiles.id）
--   4. run_activities（依赖 profiles.id, classes.id）
--   5. run_track_points（依赖 run_activities.id）
--   6. daily_stats（依赖 profiles.id）
--   7. user_stats（依赖 profiles.id）
--   8. class_stats（依赖 classes.id）
--   9. route_progress（依赖 classes.id）
--  10. route_unlocks（依赖 classes.id, run_activities.id）
--  11. sync_queue（依赖 profiles.id）

-- ============================================================
-- 01 TABLES
-- ============================================================

-- 1. classes（无外部依赖，必须在 profiles 之前创建）
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  total_route_km NUMERIC NOT NULL DEFAULT 27000,  -- 约 27,000 km（E23 V2 目标）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  real_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  class_id UUID REFERENCES public.classes(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. class_members
CREATE TABLE IF NOT EXISTS public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, user_id)
);

-- 4. run_activities
CREATE TABLE IF NOT EXISTS public.run_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id),
  distance_m INTEGER NOT NULL,
  duration_s INTEGER NOT NULL,
  pace_seconds_per_km INTEGER,
  calories INTEGER,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'gps',
  device_platform TEXT,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('pending', 'valid', 'rejected')),
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'synced', 'queued')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. run_track_points
CREATE TABLE IF NOT EXISTS public.run_track_points (
  id BIGSERIAL PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.run_activities(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy_m NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL,
  UNIQUE(activity_id, seq)
);

-- 6. daily_stats
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  distance_m INTEGER NOT NULL DEFAULT 0,
  duration_s INTEGER NOT NULL DEFAULT 0,
  activity_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

-- 7. user_stats
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_distance_m INTEGER NOT NULL DEFAULT 0,
  total_duration_s INTEGER NOT NULL DEFAULT 0,
  total_activities INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. class_stats
CREATE TABLE IF NOT EXISTS public.class_stats (
  class_id UUID PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  total_distance_m INTEGER NOT NULL DEFAULT 0,
  total_duration_s INTEGER NOT NULL DEFAULT 0,
  total_activities INTEGER NOT NULL DEFAULT 0,
  active_members INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. route_progress
CREATE TABLE IF NOT EXISTS public.route_progress (
  class_id UUID PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  current_city_index INTEGER NOT NULL DEFAULT 0,
  current_city_name TEXT,
  next_city_name TEXT,
  distance_to_next_km NUMERIC NOT NULL DEFAULT 0,
  completed_km NUMERIC NOT NULL DEFAULT 0,
  progress_pct NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. route_unlocks
CREATE TABLE IF NOT EXISTS public.route_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  city_index INTEGER NOT NULL,
  city_name TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger_activity_id UUID REFERENCES public.run_activities(id),
  UNIQUE(class_id, city_index)
);

-- 11. sync_queue
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- ============================================================
-- 02 INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_run_activities_user_id ON public.run_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_run_activities_class_id ON public.run_activities(class_id);
CREATE INDEX IF NOT EXISTS idx_run_activities_client_id ON public.run_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_run_activities_created_at ON public.run_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_points_activity ON public.run_track_points(activity_id);
CREATE INDEX IF NOT EXISTS idx_track_points_activity_seq ON public.run_track_points(activity_id, seq);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON public.sync_queue(user_id);

-- ============================================================
-- 03 ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_track_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 04 SECURITY DEFINER FUNCTIONS (bypass RLS for class checks)
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_class_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT class_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- 05 POLICIES (all class checks use user_class_id() to avoid recursion)
-- ============================================================

-- classes
DROP POLICY IF EXISTS "authenticated users can read classes" ON public.classes;
CREATE POLICY "authenticated users can read classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admins can manage classes" ON public.classes;
CREATE POLICY "admins can manage classes"
  ON public.classes FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- profiles
DROP POLICY IF EXISTS "users can read own profile" ON public.profiles;
CREATE POLICY "users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users can insert own profile" ON public.profiles;
CREATE POLICY "users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users can update own profile" ON public.profiles;
CREATE POLICY "users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- class_id / role / status can only be modified by admins or system
-- Note: direct UPDATE of these fields by regular users will be rejected
-- by the BEFORE UPDATE trigger defined below

DROP POLICY IF EXISTS "classmates can read basic info" ON public.profiles;
CREATE POLICY "classmates can read basic info"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.user_class_id() = class_id
  );

-- class_members
DROP POLICY IF EXISTS "members can read their class roster" ON public.class_members;
CREATE POLICY "members can read their class roster"
  ON public.class_members FOR SELECT
  TO authenticated
  USING (
    class_id = public.user_class_id()
  );

DROP POLICY IF EXISTS "users cannot self-insert membership" ON public.class_members;
CREATE POLICY "users cannot self-insert membership"
  ON public.class_members FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "admins can manage membership" ON public.class_members;
CREATE POLICY "admins can manage membership"
  ON public.class_members FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- run_activities
DROP POLICY IF EXISTS "users manage own activities" ON public.run_activities;
CREATE POLICY "users manage own activities"
  ON public.run_activities FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "classmates can read valid activities" ON public.run_activities;
CREATE POLICY "classmates can read valid activities"
  ON public.run_activities FOR SELECT
  TO authenticated
  USING (
    status = 'valid'
    AND class_id = public.user_class_id()
  );

-- run_track_points
DROP POLICY IF EXISTS "users manage own track points" ON public.run_track_points;
CREATE POLICY "users manage own track points"
  ON public.run_track_points FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.run_activities ra
      WHERE ra.id = activity_id AND ra.user_id = auth.uid()
    )
  );

-- daily_stats
DROP POLICY IF EXISTS "users manage own daily stats" ON public.daily_stats;
CREATE POLICY "users manage own daily stats"
  ON public.daily_stats FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- user_stats
DROP POLICY IF EXISTS "users manage own stats" ON public.user_stats;
CREATE POLICY "users manage own stats"
  ON public.user_stats FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "classmates can read user stats" ON public.user_stats;
CREATE POLICY "classmates can read user stats"
  ON public.user_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.class_id = (SELECT class_id FROM public.profiles WHERE id = public.user_stats.user_id)
    )
  );

-- class_stats
DROP POLICY IF EXISTS "members can read class stats" ON public.class_stats;
CREATE POLICY "members can read class stats"
  ON public.class_stats FOR SELECT
  TO authenticated
  USING (
    class_id = public.user_class_id()
  );

DROP POLICY IF EXISTS "only triggers can write class stats" ON public.class_stats;
CREATE POLICY "only triggers can write class stats"
  ON public.class_stats FOR ALL
  TO authenticated
  USING (false);

-- route_progress
DROP POLICY IF EXISTS "members can read route progress" ON public.route_progress;
CREATE POLICY "members can read route progress"
  ON public.route_progress FOR SELECT
  TO authenticated
  USING (
    class_id = public.user_class_id()
  );

DROP POLICY IF EXISTS "only triggers can write route progress" ON public.route_progress;
CREATE POLICY "only triggers can write route progress"
  ON public.route_progress FOR ALL
  TO authenticated
  USING (false);

-- route_unlocks
DROP POLICY IF EXISTS "members can read route unlocks" ON public.route_unlocks;
CREATE POLICY "members can read route unlocks"
  ON public.route_unlocks FOR SELECT
  TO authenticated
  USING (
    class_id = public.user_class_id()
  );

-- sync_queue
DROP POLICY IF EXISTS "users manage own queue" ON public.sync_queue;
CREATE POLICY "users manage own queue"
  ON public.sync_queue FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 05 SEED DATA
-- ============================================================
INSERT INTO public.classes (name, display_name, total_route_km)
VALUES ('E23', '北大汇丰 EMBA E23 班', 27000)  -- 约 27,000 km（E23 V2 目标）
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    total_route_km = EXCLUDED.total_route_km;
