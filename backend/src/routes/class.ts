// 班级：环线总进度 / 排行榜（仅 approved 成员）
import type { FastifyInstance } from 'fastify';
import { CONFIG } from '../config.js';
import { getCurrentRouteVersion } from '../services/progress.js';

export async function classRoutes(app: FastifyInstance) {
  app.get('/progress', { preHandler: [app.authenticate] }, async () => {
    const rv = await getCurrentRouteVersion(app.prisma);
    if (!rv) {
      return { routeVersion: null, totalM: 0, memberCount: 0, todayCount: 0, serverTime: new Date().toISOString() };
    }
    const progress = await app.prisma.routeProgress.findUnique({
      where: { routeVersionId_userId: { routeVersionId: rv.id, userId: CONFIG.CLASS_SENTINEL } },
    });
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const [memberCount, todayCount] = await Promise.all([
      app.prisma.user.count({ where: { status: 'approved', role: 'member' } }),
      app.prisma.activity.count({ where: { status: 'valid', startedAt: { gte: dayStart }, user: { status: 'approved' } } }),
    ]);
    return {
      routeVersion: {
        packId: rv.packId,
        version: rv.version,
        status: rv.status,
        totalKm: rv.totalKm,
      },
      totalM: progress?.totalM ?? 0,
      activityCount: progress?.activityCount ?? 0,
      memberCount,
      todayCount,
      serverTime: new Date().toISOString(),
    };
  });

  app.get('/leaderboard', { preHandler: [app.authenticate] }, async () => {
    const rv = await getCurrentRouteVersion(app.prisma);
    const rows = rv
      ? await app.prisma.routeProgress.findMany({
          where: { routeVersionId: rv.id, userId: { not: CONFIG.CLASS_SENTINEL } },
          orderBy: { totalM: 'desc' },
          take: 100,
        })
      : [];
    const userIds = rows.map((r) => r.userId);
    const users = await app.prisma.user.findMany({
      where: { id: { in: userIds }, status: 'approved' },
      select: { id: true, nickname: true, avatarUrl: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      leaderboard: rows
        .filter((r) => byId.has(r.userId))
        .map((r, i) => ({
          rank: i + 1,
          userId: r.userId,
          nickname: byId.get(r.userId)!.nickname,
          avatarUrl: byId.get(r.userId)!.avatarUrl,
          totalM: r.totalM,
          activityCount: r.activityCount,
        })),
      serverTime: new Date().toISOString(),
    };
  });
}
