// E23跑起来 · Cloud Run Repository
// 云端跑步记录 CRUD，与 localStorage 配合使用

import { getSupabase, isSupabaseEnabled } from '../lib/supabase';

type InsertResult = { ok: boolean; id?: string; error?: string };

/** Supabase 通用数据访问 */
function db() {
  const sb = getSupabase();
  return sb;
}

export const X = {
  /** 通用插入 */
  async insert(table: string, record: Record<string, unknown>): Promise<InsertResult> {
    const sb = db();
    if (!sb) return { ok: false, error: 'Supabase 未配置' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb.from(table) as any).insert(record).select('id').single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id as string | undefined };
  },

  /** 幂等 upsert */
  async upsert(table: string, record: Record<string, unknown>, conflict: string): Promise<InsertResult> {
    const sb = db();
    if (!sb) return { ok: false, error: 'Supabase 未配置' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb.from(table) as any).upsert(record, { onConflict: conflict, ignoreDuplicates: false }).select('id').single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id as string | undefined };
  },

  /** 更新 */
  async update(table: string, id: string, updates: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    const sb = db();
    if (!sb) return { ok: false, error: 'Supabase 未配置' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (sb.from(table) as any).update(updates).eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  /** 列出 */
  async list(table: string, filters: Record<string, unknown> = {}, limit = 50): Promise<{ ok: boolean; data?: unknown[]; error?: string }> {
    const sb = db();
    if (!sb) return { ok: false, error: 'Supabase 未配置' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (sb.from(table) as any).select('*');
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined) query = query.eq(k, v);
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data ?? [] };
  },

  /** 批量 upsert */
  async upsertBatch(table: string, records: Record<string, unknown>[], conflict: string): Promise<{ ok: boolean; error?: string }> {
    if (records.length === 0) return { ok: true };
    const sb = db();
    if (!sb) return { ok: false, error: 'Supabase 未配置' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (sb.from(table) as any).upsert(records, { onConflict: conflict, ignoreDuplicates: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },
};

/** 跑步活动同步 */
export const CloudRunRepo = {
  isAvailable: (): boolean => isSupabaseEnabled(),

  async createActivity(record: Record<string, unknown>): Promise<InsertResult> {
    return X.insert('run_activities', record);
  },

  async upsertActivity(record: Record<string, unknown>): Promise<InsertResult> {
    return X.upsert('run_activities', record, 'client_id');
  },

  async updateActivity(id: string, updates: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    return X.update('run_activities', id, updates);
  },

  async listByUser(userId: string, limit = 50): Promise<{ ok: boolean; data?: unknown[]; error?: string }> {
    return X.list('run_activities', { user_id: userId }, limit);
  },

  async listByClass(classId: string, limit = 100): Promise<{ ok: boolean; data?: unknown[]; error?: string }> {
    const sb = db();
    if (!sb) return { ok: false, error: 'Supabase 未配置' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb.from('run_activities') as any)
      .select('*')
      .eq('class_id', classId)
      .eq('status', 'valid')
      .order('created_at', { ascending: false })
      .limit(limit);
    return { ok: !error, data: data ?? [], error: error?.message };
  },

  async uploadTrackPoints(points: Record<string, unknown>[]): Promise<{ ok: boolean; error?: string }> {
    return X.upsertBatch('run_track_points', points, 'activity_id, seq');
  },
};

/** 统计和排行 */
export const CloudStatsRepo = {
  async getClassStats(classId: string) {
    const sb = db();
    if (!sb) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb.from('class_stats') as any).select('*').eq('class_id', classId).single();
    return data;
  },

  async getUserStats(userId: string) {
    const sb = db();
    if (!sb) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb.from('user_stats') as any).select('*').eq('user_id', userId).single();
    return data;
  },

  async getLeaderboard(limit = 50) {
    const sb = db();
    if (!sb) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb.from('user_stats') as any)
      .select('*, profiles!inner(nickname, avatar_url)')
      .order('total_distance_m', { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  async getRouteProgress(classId: string) {
    const sb = db();
    if (!sb) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb.from('route_progress') as any).select('*').eq('class_id', classId).single();
    return data;
  },
};

/** Realtime 订阅 */
export const CloudRealtime = {
  onClassStatsChange(classId: string, callback: (payload: unknown) => void) {
    const sb = db();
    if (!sb) return () => {};
    const ch = sb.channel(`cs-${classId}`)
      .on('postgres_changes' as never, { event: '*', schema: 'public', table: 'class_stats', filter: `class_id=eq.${classId}` } as never, callback)
      .subscribe();
    return () => { sb.removeChannel(ch); };
  },

  onRouteProgressChange(classId: string, callback: (payload: unknown) => void) {
    const sb = db();
    if (!sb) return () => {};
    const ch = sb.channel(`rp-${classId}`)
      .on('postgres_changes' as never, { event: '*', schema: 'public', table: 'route_progress', filter: `class_id=eq.${classId}` } as never, callback)
      .subscribe();
    return () => { sb.removeChannel(ch); };
  },

  onNewActivity(classId: string, callback: (payload: unknown) => void) {
    const sb = db();
    if (!sb) return () => {};
    const ch = sb.channel(`na-${classId}`)
      .on('postgres_changes' as never, { event: 'INSERT', schema: 'public', table: 'run_activities', filter: `class_id=eq.${classId}` } as never, callback)
      .subscribe();
    return () => { sb.removeChannel(ch); };
  },
};
