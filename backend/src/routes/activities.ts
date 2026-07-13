import type { FastifyInstance } from 'fastify';
import { prisma } from '../services/db.js';

interface CreateActivityBody {
  id: string;
  user_id: string;
  source?: string;
  activity_type?: string;
  distance_km: number;
  duration_sec: number;
  pace_sec?: number;
  calories?: number;
  start_time: string;
  gps_track?: unknown;
  note?: string;
}

interface BatchBody {
  user_id: string;
  activities: CreateActivityBody[];
}

export function activityRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  // POST /v1/activities - 单条上传
  app.post<{ Body: CreateActivityBody }>('/', async (req, reply) => {
    const body = req.body;
    const pace = body.pace_sec || (body.duration_sec / body.distance_km);

    try {
      const activity = await prisma.activity.create({
        data: {
          id: body.id,
          userId: body.user_id,
          source: body.source || 'manual',
          activityType: body.activity_type || 'running',
          distanceKm: body.distance_km,
          durationSec: body.duration_sec,
          paceSec: pace,
          calories: body.calories,
          startTime: new Date(body.start_time),
          gpsTrack: body.gps_track || undefined,
          note: body.note,
        },
      });

      return reply.status(201).send({
        id: activity.id,
        virtualKm: Math.round(activity.distanceKm * 10 * 100) / 100,
        status: 'created',
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
        // 主键冲突 = 已经上传过，幂等返回
        return reply.send({
          id: body.id,
          virtualKm: Math.round(body.distance_km * 10 * 100) / 100,
          status: 'duplicate',
        });
      }
      throw err;
    }
  });

  // POST /v1/activities/batch - 批量上传
  app.post<{ Body: BatchBody }>('/batch', async (req, reply) => {
    const { user_id, activities } = req.body;
    let uploaded = 0;
    let duplicates = 0;

    for (const act of activities) {
      const pace = act.pace_sec || (act.duration_sec / act.distance_km);
      try {
        await prisma.activity.create({
          data: {
            id: act.id,
            userId: user_id,
            source: act.source || 'manual',
            activityType: act.activity_type || 'running',
            distanceKm: act.distance_km,
            durationSec: act.duration_sec,
            paceSec: pace,
            calories: act.calories,
            startTime: new Date(act.start_time),
            gpsTrack: act.gps_track || undefined,
            note: act.note,
          },
        });
        uploaded++;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
          duplicates++;
        } else {
          throw err;
        }
      }
    }

    // 计算该用户的总虚拟公里
    const stats = await prisma.activity.aggregate({
      where: { userId: user_id },
      _sum: { distanceKm: true },
    });

    const totalVirtualKm = Math.round((stats._sum.distanceKm || 0) * 10 * 100) / 100;

    return reply.send({ uploaded, duplicates, total_virtual_km: totalVirtualKm });
  });

  // GET /v1/activities/user/:userId
  app.get<{ Params: { userId: string }; Querystring: { since?: string; until?: string; limit?: string; offset?: string } }>(
    '/user/:userId',
    async (req, reply) => {
      const { userId } = req.params;
      const { since, until, limit, offset } = req.query;

      const whereClause: { userId: string; startTime?: { gte?: Date; lte?: Date } } = {
        userId,
      };
      if (since || until) {
        whereClause.startTime = {} as Record<string, Date>;
        if (since) (whereClause.startTime as Record<string, Date>).gte = new Date(since);
        if (until) (whereClause.startTime as Record<string, Date>).lte = new Date(until);
      }

      const take = Math.min(parseInt(limit || '50', 10), 200);
      const skip = parseInt(offset || '0', 10);

      const [activities, total] = await Promise.all([
        prisma.activity.findMany({
          where: whereClause,
          orderBy: { startTime: 'desc' },
          take,
          skip,
        }),
        prisma.activity.count({ where: whereClause }),
      ]);

      return reply.send({
        activities: activities.map((a) => ({
          id: a.id,
          user_id: a.userId,
          source: a.source,
          activity_type: a.activityType,
          distance_km: a.distanceKm,
          duration_sec: a.durationSec,
          pace_sec: a.paceSec,
          calories: a.calories,
          start_time: a.startTime,
          gps_track: a.gpsTrack,
          note: a.note,
          created_at: a.createdAt,
        })),
        total,
        limit: take,
        offset: skip,
      });
    }
  );

  done();
}
