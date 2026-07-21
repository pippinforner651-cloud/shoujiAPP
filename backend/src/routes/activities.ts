// 活动上传（幂等）/批量同步/我的记录与统计
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RULES } from '../config.js';
import { validateActivity, type ActivityInput } from '../services/validation.js';
import { recomputeProgress, getCurrentRouteVersion } from '../services/progress.js';

const trackPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(10000).nullish(),
  timestamp: z.string().datetime({ offset: true }).or(z.string().datetime()),
});

const createSchema = z.object({
  clientId: z.string().min(8).max(64),
  source: z.enum(['gps', 'manual', 'watch', 'joyrun', 'wechat']),
  distanceM: z.number().int().positive(),
  durationSec: z.number().int().positive(),
  startedAt: z.string(),
  endedAt: z.string(),
  trackPoints: z.array(trackPointSchema).max(RULES.MAX_TRACK_POINTS).optional(),
  evidenceNote: z.string().max(500).optional(),
  evidenceImageUrl: z.string().url().max(500).optional(),
});

const syncSchema = z.object({
  activities: z.array(createSchema).min(1).max(RULES.MAX_SYNC_BATCH),
});

function publicActivity(a: {
  id: string; clientId: string; source: string; status: string;
  distanceM: number; durationSec: number; avgPaceSec: number;
  startedAt: Date; endedAt: Date; rejectReason: string | null; createdAt: Date;
}) {
  return {
    id: a.id,
    clientId: a.clientId,
    source: a.source,
    status: a.status,
    distanceM: a.distanceM,
    durationSec: a.durationSec,
    avgPaceSec: a.avgPaceSec,
    startedAt: a.startedAt.toISOString(),
    endedAt: a.endedAt.toISOString(),
    rejectReason: a.rejectReason,
    createdAt: a.createdAt.toISOString(),
  };
}

/** 核心创建逻辑：幂等 + 校验引擎 + valid 才重算进度。
 *  trusted 仅服务端内部调用置位（悦跑圈官方 API 拉取），客户端路由永不置位 */
export async function createOne(
  app: FastifyInstance,
  userId: string,
  body: z.infer<typeof createSchema>,
  opts?: { trusted?: boolean },
): Promise<{ activity: ReturnType<typeof publicActivity>; duplicated: boolean; verdictReason?: string }> {
  // 幂等：同 userId+clientId 直接返回已存在的记录
  const dup = await app.prisma.activity.findUnique({
    where: { userId_clientId: { userId, clientId: body.clientId } },
  });
  if (dup) {
    return { activity: publicActivity(dup), duplicated: true };
  }

  // 当日手动补录累计（用于当日上限规则）
  const dayStart = new Date(body.startedAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400_000);
  const manualAgg = await app.prisma.activity.aggregate({
    where: {
      userId,
      source: 'manual',
      status: { in: ['pending', 'valid'] },
      startedAt: { gte: dayStart, lt: dayEnd },
    },
    _sum: { distanceM: true },
  });
  const manualKmToday = (manualAgg._sum.distanceM ?? 0) / 1000;

  const verdict = validateActivity({ ...(body as ActivityInput), trustedSource: opts?.trusted === true }, manualKmToday);

  const created = await app.prisma.$transaction(async (tx) => {
    const a = await tx.activity.create({
      data: {
        userId,
        clientId: body.clientId,
        source: body.source,
        status: verdict.status,
        distanceM: body.distanceM,
        durationSec: body.durationSec,
        avgPaceSec: verdict.avgPaceSec,
        startedAt: new Date(body.startedAt),
        endedAt: new Date(body.endedAt),
        rejectReason: verdict.status === 'rejected' ? verdict.reason : null,
        trackPoints: body.trackPoints?.length
          ? {
              create: body.trackPoints.map((p, i) => ({
                seq: i,
                lat: p.lat,
                lon: p.lon,
                accuracyM: p.accuracyM ?? null,
                timestamp: new Date(p.timestamp),
              })),
            }
          : undefined,
        evidence:
          body.source === 'manual' && (body.evidenceNote || body.evidenceImageUrl)
            ? { create: { note: body.evidenceNote ?? '', imageUrl: body.evidenceImageUrl ?? null } }
            : undefined,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: verdict.status === 'valid' ? 'ACTIVITY_VALIDATED' : verdict.status === 'pending' ? 'ACTIVITY_PENDING' : 'ACTIVITY_REJECTED',
        targetId: a.id,
        detail: verdict.reason ?? `pace=${verdict.avgPaceSec}`,
      },
    });
    return a;
  });

  // valid 才计入汇总（个人 + 全班）
  if (verdict.status === 'valid') {
    const rv = await getCurrentRouteVersion(app.prisma);
    if (rv) await recomputeProgress(app.prisma, rv.id, userId);
  }

  return { activity: publicActivity(created), duplicated: false, verdictReason: verdict.reason };
}

export async function activityRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: [app.requireApproved] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message ?? '参数错误' });
    }
    const result = await createOne(app, req.user.sub, parsed.data);
    return reply.code(result.duplicated ? 200 : 201).send(result);
  });

  // 批量同步（离线队列回补）：逐条走同一创建逻辑，单条失败不影响其他
  app.post('/sync', { preHandler: [app.requireApproved] }, async (req, reply) => {
    const parsed = syncSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: `批量最多 ${RULES.MAX_SYNC_BATCH} 条` });
    }
    const results = [];
    for (const item of parsed.data.activities) {
      try {
        results.push({ clientId: item.clientId, ok: true, ...(await createOne(app, req.user.sub, item)) });
      } catch (e) {
        results.push({ clientId: item.clientId, ok: false, error: e instanceof Error ? e.message : 'unknown' });
      }
    }
    return { synced: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  });

  app.get('/mine', { preHandler: [app.authenticate] }, async (req) => {
    const list = await app.prisma.activity.findMany({
      where: { userId: req.user.sub },
      orderBy: { startedAt: 'desc' },
      take: 200,
    });
    return { activities: list.map(publicActivity) };
  });

  app.get('/mine/stats', { preHandler: [app.authenticate] }, async (req) => {
    const uid = req.user.sub;
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, month, pendingCount] = await Promise.all([
      app.prisma.activity.aggregate({ where: { userId: uid, status: 'valid' }, _sum: { distanceM: true, durationSec: true }, _count: { _all: true } }),
      app.prisma.activity.aggregate({ where: { userId: uid, status: 'valid', startedAt: { gte: dayStart } }, _sum: { distanceM: true }, _count: { _all: true } }),
      app.prisma.activity.aggregate({ where: { userId: uid, status: 'valid', startedAt: { gte: monthStart } }, _sum: { distanceM: true } }),
      app.prisma.activity.count({ where: { userId: uid, status: 'pending' } }),
    ]);

    const totalM = total._sum.distanceM ?? 0;
    const totalSec = total._sum.durationSec ?? 0;
    return {
      totalM,
      totalCount: total._count._all,
      totalDurationSec: totalSec,
      avgPaceSec: totalM > 0 ? Math.round(totalSec / (totalM / 1000)) : 0,
      todayM: today._sum.distanceM ?? 0,
      todayCount: today._count._all,
      monthM: month._sum.distanceM ?? 0,
      pendingCount,
      serverTime: now.toISOString(),
    };
  });
}
