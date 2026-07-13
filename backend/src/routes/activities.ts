import type { FastifyInstance } from 'fastify';
import { prisma } from '../services/db.js';

/* =========================================
 * Phase 6.3 — 新接口支持 UnifiedActivity
 * ========================================= */

interface CreateActivityBody {
  id: string;
  user_id: string;
  source?: string;
  source_activity_id?: string;
  sport_type?: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  distance_meters: number;
  pace_seconds_per_km?: number;
  calories?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  elevation_gain?: number;
  route_data?: unknown;
  device_name?: string;
  sync_time?: string;
  verification_status?: string;
  raw_data_hash?: string;
}

interface BatchBody {
  user_id: string;
  activities: CreateActivityBody[];
}

export function activityRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  // POST /v1/activities - 单条上传（新模型）
  app.post<{ Body: CreateActivityBody }>('/', async (req, reply) => {
    const body = req.body;
    const pace = body.pace_seconds_per_km || (body.duration_seconds / (body.distance_meters / 1000 || 1));

    try {
      const activity = await prisma.activity.create({
        data: {
          id: body.id,
          userId: body.user_id,
          source: body.source || 'app_gps',
          sourceActivityId: body.source_activity_id,
          sportType: body.sport_type || 'running',
          startTime: new Date(body.start_time),
          endTime: body.end_time ? new Date(body.end_time) : undefined,
          durationSeconds: body.duration_seconds,
          distanceMeters: body.distance_meters,
          paceSecondsPerKm: pace,
          calories: body.calories,
          avgHeartRate: body.avg_heart_rate,
          maxHeartRate: body.max_heart_rate,
          elevationGain: body.elevation_gain,
          routeData: body.route_data || undefined,
          deviceName: body.device_name,
          syncTime: body.sync_time ? new Date(body.sync_time) : undefined,
          verificationStatus: body.verification_status || 'verified_device',
          rawDataHash: body.raw_data_hash,
        },
      });

      const km = body.distance_meters / 1000;
      return reply.status(201).send({
        id: activity.id,
        virtualKm: Math.round(km * 10 * 100) / 100,
        status: 'created',
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
        return reply.send({
          id: body.id,
          virtualKm: Math.round((body.distance_meters / 1000) * 10 * 100) / 100,
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
      const pace = act.pace_seconds_per_km || (act.duration_seconds / (act.distance_meters / 1000 || 1));
      try {
        await prisma.activity.create({
          data: {
            id: act.id,
            userId: user_id,
            source: act.source || 'app_gps',
            sourceActivityId: act.source_activity_id,
            sportType: act.sport_type || 'running',
            startTime: new Date(act.start_time),
            endTime: act.end_time ? new Date(act.end_time) : undefined,
            durationSeconds: act.duration_seconds,
            distanceMeters: act.distance_meters,
            paceSecondsPerKm: pace,
            calories: act.calories,
            avgHeartRate: act.avg_heart_rate,
            maxHeartRate: act.max_heart_rate,
            elevationGain: act.elevation_gain,
            routeData: act.route_data || undefined,
            deviceName: act.device_name,
            syncTime: act.sync_time ? new Date(act.sync_time) : undefined,
            verificationStatus: act.verification_status || 'verified_device',
            rawDataHash: act.raw_data_hash,
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

    const stats = await prisma.activity.aggregate({
      where: { userId: user_id },
      _sum: { distanceMeters: true },
    });

    const totalKm = (stats._sum.distanceMeters || 0) / 1000;
    const totalVirtualKm = Math.round(totalKm * 10 * 100) / 100;

    return reply.send({ uploaded, duplicates, total_virtual_km: totalVirtualKm });
  });

  // GET /v1/activities/user/:userId
  app.get<{ Params: { userId: string }; Querystring: { since?: string; until?: string; limit?: string; offset?: string; status?: string } }>(
    '/user/:userId',
    async (req, reply) => {
      const { userId } = req.params;
      const { since, until, limit, offset, status } = req.query;

      const whereClause: Record<string, unknown> = { userId };
      if (since || until) {
        whereClause.startTime = {} as Record<string, Date>;
        if (since) (whereClause.startTime as Record<string, Date>).gte = new Date(since);
        if (until) (whereClause.startTime as Record<string, Date>).lte = new Date(until);
      }
      if (status) {
        whereClause.verificationStatus = status;
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
          source_activity_id: a.sourceActivityId,
          sport_type: a.sportType,
          start_time: a.startTime,
          end_time: a.endTime,
          duration_seconds: a.durationSeconds,
          distance_meters: a.distanceMeters,
          pace_seconds_per_km: a.paceSecondsPerKm,
          calories: a.calories,
          avg_heart_rate: a.avgHeartRate,
          max_heart_rate: a.maxHeartRate,
          elevation_gain: a.elevationGain,
          route_data: a.routeData,
          device_name: a.deviceName,
          sync_time: a.syncTime,
          verification_status: a.verificationStatus,
          raw_data_hash: a.rawDataHash,
          created_at: a.createdAt,
        })),
        total,
        limit: take,
        offset: skip,
      });
    }
  );

  // DELETE /v1/activities/:id - 软删除（标记 invalid）
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { id } = req.params;
    await prisma.activity.update({
      where: { id },
      data: { verificationStatus: 'invalid' },
    });
    return reply.send({ status: 'marked_invalid' });
  });

  done();
}
