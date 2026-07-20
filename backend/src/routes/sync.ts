import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from '../services/db.js';

interface SyncBody {
  user_id: string;
  profile?: {
    nickname?: string;
    avatar?: string;
    level?: number;
    experience?: number;
  };
  activities?: Array<{
    id: string;
    source?: string;
    activity_type?: string;
    distance_km: number;
    duration_sec: number;
    pace_sec?: number;
    calories?: number;
    start_time: string;
    gps_track?: unknown;
    note?: string;
  }>;
  last_sync_at?: string;
}

export function syncRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  // POST /v1/sync - 全量同步
  app.post<{ Body: SyncBody }>('/', async (req, reply) => {
    const { user_id, profile, activities, last_sync_at } = req.body;

    // 1. 更新用户资料
    if (profile) {
      await prisma.user.upsert({
        where: { id: user_id },
        update: {
          nickname: profile.nickname,
          avatar: profile.avatar,
          level: profile.level,
          experience: profile.experience,
          lastSyncAt: new Date(),
        },
        create: {
          id: user_id,
          nickname: profile.nickname || '跑者',
          avatar: profile.avatar || 'default',
        },
      });
    }

    // 2. 上传活动记录
    let uploaded = 0;
    if (activities && activities.length > 0) {
      for (const act of activities) {
        const pace = act.pace_sec || (act.duration_sec / act.distance_km);
        try {
          await prisma.activity.create({
            data: {
              id: act.id,
              userId: user_id,
              source: act.source || 'manual',
              sportType: act.activity_type || 'running',
              distanceMeters: act.distance_km * 1000,
              durationSeconds: act.duration_sec,
              paceSecondsPerKm: pace,
              calories: act.calories,
              startTime: new Date(act.start_time),
              routeData: act.gps_track === undefined ? undefined : act.gps_track as Prisma.InputJsonValue,
            },
          });
          uploaded++;
        } catch {
          // duplicate, ignore
        }
      }
    }

    // 3. 下载增量记录
    let downloaded: Array<Record<string, unknown>> = [];
    if (last_sync_at) {
      const cloudRecords = await prisma.activity.findMany({
        where: {
          userId: user_id,
          createdAt: { gt: new Date(last_sync_at) },
        },
        orderBy: { startTime: 'desc' },
      });
      downloaded = cloudRecords.map((a) => ({
        id: a.id,
        user_id: a.userId,
        source: a.source,
        distance_km: a.distanceMeters / 1000,
        duration_sec: a.durationSeconds,
        pace_sec: a.paceSecondsPerKm,
        calories: a.calories,
        start_time: a.startTime,
        note: null,
        created_at: a.createdAt,
      }));
    }

    // 4. 排行榜排名
    const allStats = await prisma.activity.groupBy({
      by: ['userId'],
      _sum: { distanceMeters: true },
      orderBy: { _sum: { distanceMeters: 'desc' } },
    });
    const rank = allStats.findIndex((s) => s.userId === user_id) + 1;

    // 5. 记录同步日志
    await prisma.syncLog.create({
      data: {
        userId: user_id,
        syncType: 'full',
        status: 'success',
        recordsUploaded: uploaded,
        recordsDownloaded: downloaded.length,
      },
    });

    // 6. 计算总虚拟公里
    const myStats = allStats.find((s) => s.userId === user_id);
    const totalVirtualKm = Math.round(((myStats?._sum.distanceMeters || 0) / 1000) * 10 * 100) / 100;

    return reply.send({
      uploaded,
      downloaded,
      leaderboard: {
        rank: rank > 0 ? rank : allStats.length + 1,
        total_participants: allStats.length,
      },
      total_virtual_km: totalVirtualKm,
      server_time: new Date().toISOString(),
    });
  });

  done();
}
