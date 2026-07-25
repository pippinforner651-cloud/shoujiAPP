# 03_DATABASE_SCHEMA.md
## E23跑起来 · Phase 2 数据库 Schema 设计

目标: Supabase PostgreSQL

## 表结构

### users (Supabase Auth 内置 + 扩展)
```sql
-- Supabase 自动管理 auth.users
-- 扩展表:
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nickname TEXT NOT NULL,
  real_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  class_id UUID REFERENCES public.classes(id),
  role TEXT CHECK (role IN ('member', 'admin')) DEFAULT 'member',
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### classes
```sql
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,           -- 'E23'
  display_name TEXT,            -- '北大汇丰 EMBA E23 班'
  total_route_km NUMERIC DEFAULT 21423,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### class_members
```sql
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id),
  user_id UUID REFERENCES public.profiles(id),
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now()
);
```

### run_activities
```sql
CREATE TABLE public.run_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE,         -- 客户端幂等键
  user_id UUID REFERENCES public.profiles(id),
  class_id UUID REFERENCES public.classes(id),
  distance_km NUMERIC NOT NULL,
  duration_sec INTEGER NOT NULL,
  avg_pace_sec NUMERIC,
  calories INTEGER,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  source TEXT CHECK (source IN ('gps','manual','watch','joyrun','wechat','import')),
  device TEXT,
  status TEXT DEFAULT 'valid' CHECK (status IN ('pending','valid','rejected')),
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### run_track_points
```sql
CREATE TABLE public.run_track_points (
  id BIGSERIAL PRIMARY KEY,
  activity_id UUID REFERENCES public.run_activities(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC,
  altitude NUMERIC,
  speed NUMERIC,
  bearing NUMERIC,
  timestamp TIMESTAMPTZ NOT NULL,
  point_index INTEGER
);
CREATE INDEX idx_track_points_activity ON run_track_points(activity_id);
```

### daily_stats
```sql
CREATE TABLE public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  date DATE NOT NULL,
  distance_km NUMERIC DEFAULT 0,
  duration_sec INTEGER DEFAULT 0,
  activity_count INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);
```

### user_stats
```sql
CREATE TABLE public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id),
  total_distance_km NUMERIC DEFAULT 0,
  total_duration_sec INTEGER DEFAULT 0,
  total_activities INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### class_stats
```sql
CREATE TABLE public.class_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id),
  total_distance_km NUMERIC DEFAULT 0,
  total_duration_sec INTEGER DEFAULT 0,
  total_activities INTEGER DEFAULT 0,
  active_members INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### route_progress
```sql
CREATE TABLE public.route_progress (
  class_id UUID PRIMARY KEY REFERENCES public.classes(id),
  current_city_index INTEGER DEFAULT 0,
  current_city_name TEXT,
  next_city_name TEXT,
  distance_to_next_km NUMERIC DEFAULT 0,
  completed_km NUMERIC DEFAULT 0,
  progress_pct NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### route_unlocks
```sql
CREATE TABLE public.route_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id),
  city_index INTEGER NOT NULL,
  city_name TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  trigger_activity_id UUID REFERENCES public.run_activities(id)
);
```

### sync_queue
```sql
CREATE TABLE public.sync_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);
```

## Row Level Security

```sql
-- users can only CRUD their own activities
ALTER TABLE run_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_own_activities ON run_activities
  FOR ALL USING (user_id = auth.uid());

-- but everyone can read aggregates
CREATE POLICY read_class_stats ON class_stats
  FOR SELECT USING (true);

-- read leaderboard
CREATE POLICY read_leaderboard ON user_stats
  FOR SELECT USING (true);
```

## 数据迁移

- `localStorage` → `user_stats` 迁移脚本 (在 Phase 2.1 实现)
- 现有 `e23_records_v1` → `run_activities` 批量导入
- 旧记录 `sync_status = 'local'`, 新记录 `sync_status = 'synced'`
