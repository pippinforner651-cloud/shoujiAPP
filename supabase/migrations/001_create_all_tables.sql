-- E23跑起来 · Phase 2.1 数据库迁移
-- 创建 11 张云端业务表
-- 从第一版即启用 Row Level Security

-- ============================================================
-- 1. profiles（扩展 Supabase auth.users）
-- ============================================================
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 本人可读/写自己的 profile
CREATE POLICY "users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 班级成员可读同班公开资料
CREATE POLICY "classmates can read basic info"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.class_id = public.profiles.class_id
    )
  );

-- ============================================================
-- 2. classes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT,
  total_route_km NUMERIC NOT NULL DEFAULT 21423,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 所有认证用户可读班级信息
CREATE POLICY "authenticated users can read classes"
  ON public.classes FOR SELECT
  USING (auth.role() = 'authenticated');

-- 仅管理员可写
CREATE POLICY "admins can manage classes"
  ON public.classes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 3. class_members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, user_id)
);

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- 用户可读自己所属班级的成员
CREATE POLICY "members can read their class roster"
  ON public.class_members FOR SELECT
  USING (
    class_id IN (
      SELECT cm2.class_id FROM public.class_members cm2 WHERE cm2.user_id = auth.uid()
    )
  );

-- 用户不可自行添加（需管理员或邀请码机制）
CREATE POLICY "users cannot self-insert membership"
  ON public.class_members FOR INSERT
  WITH CHECK (false);

CREATE POLICY "admins can manage membership"
  ON public.class_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 4. run_activities
-- ============================================================
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

CREATE INDEX idx_run_activities_user_id ON public.run_activities(user_id);
CREATE INDEX idx_run_activities_class_id ON public.run_activities(class_id);
CREATE INDEX idx_run_activities_client_id ON public.run_activities(client_id);
CREATE INDEX idx_run_activities_created_at ON public.run_activities(created_at DESC);

ALTER TABLE public.run_activities ENABLE ROW LEVEL SECURITY;

-- 用户只能 CRUD 自己的活动
CREATE POLICY "users manage own activities"
  ON public.run_activities FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 同班成员可读取已完成的公开活动
CREATE POLICY "classmates can read valid activities"
  ON public.run_activities FOR SELECT
  USING (
    status = 'valid'
    AND EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.class_id = public.run_activities.class_id
    )
  );

-- ============================================================
-- 5. run_track_points
-- ============================================================
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

CREATE INDEX idx_track_points_activity ON public.run_track_points(activity_id);
CREATE INDEX idx_track_points_activity_seq ON public.run_track_points(activity_id, seq);

ALTER TABLE public.run_track_points ENABLE ROW LEVEL SECURITY;

-- 仅本人可读写自己的轨迹
CREATE POLICY "users manage own track points"
  ON public.run_track_points FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.run_activities ra
      WHERE ra.id = activity_id AND ra.user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. daily_stats
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  distance_m INTEGER NOT NULL DEFAULT 0,
  duration_s INTEGER NOT NULL DEFAULT 0,
  activity_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own daily stats"
  ON public.daily_stats FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- 7. user_stats
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_distance_m INTEGER NOT NULL DEFAULT 0,
  total_duration_s INTEGER NOT NULL DEFAULT 0,
  total_activities INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- 本人可读写
CREATE POLICY "users manage own stats"
  ON public.user_stats FOR ALL
  USING (user_id = auth.uid());

-- 同班可读（排行榜用）
CREATE POLICY "classmates can read user stats"
  ON public.user_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.class_id IN (
        SELECT cm2.class_id FROM public.class_members cm2 WHERE cm2.user_id = public.user_stats.user_id
      )
    )
  );

-- ============================================================
-- 8. class_stats（服务器端可信计算，客户端不可直接写）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_stats (
  class_id UUID PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  total_distance_m INTEGER NOT NULL DEFAULT 0,
  total_duration_s INTEGER NOT NULL DEFAULT 0,
  total_activities INTEGER NOT NULL DEFAULT 0,
  active_members INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.class_stats ENABLE ROW LEVEL SECURITY;

-- 成员可读
CREATE POLICY "members can read class stats"
  ON public.class_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.class_id = public.class_stats.class_id
    )
  );

-- 仅服务端/触发器可写
CREATE POLICY "only triggers can write class stats"
  ON public.class_stats FOR ALL
  USING (false);

-- ============================================================
-- 9. route_progress（服务器端可信计算）
-- ============================================================
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

ALTER TABLE public.route_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read route progress"
  ON public.route_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.class_id = public.route_progress.class_id
    )
  );

CREATE POLICY "only triggers can write route progress"
  ON public.route_progress FOR ALL
  USING (false);

-- ============================================================
-- 10. route_unlocks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.route_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  city_index INTEGER NOT NULL,
  city_name TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger_activity_id UUID REFERENCES public.run_activities(id),
  UNIQUE(class_id, city_index)
);

ALTER TABLE public.route_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read route unlocks"
  ON public.route_unlocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.class_id = public.route_unlocks.class_id
    )
  );

-- ============================================================
-- 11. sync_queue（客户端离线队列）
-- ============================================================
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

CREATE INDEX idx_sync_queue_status ON public.sync_queue(status);
CREATE INDEX idx_sync_queue_user ON public.sync_queue(user_id);

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own queue"
  ON public.sync_queue FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- Seed: 创建 E23 班级
-- ============================================================
INSERT INTO public.classes (name, display_name, total_route_km)
VALUES ('E23', '北大汇丰 EMBA E23 班', 21423)
ON CONFLICT (id) DO NOTHING;
