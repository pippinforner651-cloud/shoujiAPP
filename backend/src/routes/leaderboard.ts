import type { FastifyInstance } from 'fastify';
import { prisma } from '../services/db.js';

export function leaderboardRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  // GET /v1/leaderboard - 全国排行
  app.get<{ Querystring: { limit?: string; offset?: string; user_id?: string; type?: string } }>(
    '/',
    async (req, reply) => {
      const { limit, offset, user_id } = req.query;
      const take = Math.min(parseInt(limit || '100', 10), 200);
      const skip = parseInt(offset || '0', 10);

      // SQL SUM 实时计算
      const ranking = await prisma.activity.groupBy({
        by: ['userId'],
        _sum: { distanceMeters: true },
        _count: true,
        orderBy: { _sum: { distanceMeters: 'desc' } },
        take,
        skip,
      });

      const userIds = ranking.map((r) => r.userId);
      const users = userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, nickname: true, avatar: true, level: true, inviteCode: true },
          })
        : [];
      const userMap = new Map(users.map((u) => [u.id, u]));

      const leaderboard = ranking.map((r, i) => ({
        rank: skip + i + 1,
        user_id: r.userId,
        nickname: userMap.get(r.userId)?.nickname || '跑者',
        avatar: userMap.get(r.userId)?.avatar || 'default',
        level: userMap.get(r.userId)?.level || 1,
        total_distance_km: Math.round(((r._sum.distanceMeters || 0) / 1000) * 100) / 100,
        run_count: r._count,
      }));

      const totalParticipants = await prisma.activity.groupBy({ by: ['userId'] });

      let userRank = null;
      if (user_id) {
        const idx = ranking.findIndex((r) => r.userId === user_id);
        const userStats = await prisma.activity.aggregate({
          where: { userId: user_id },
          _sum: { distanceMeters: true },
        });
        userRank = {
          rank: idx >= 0 ? idx + 1 : totalParticipants.length + 1,
          total_distance_km: Math.round(((userStats._sum.distanceMeters || 0) / 1000) * 100) / 100,
        };
      }

      const globalSum = await prisma.activity.aggregate({ _sum: { distanceMeters: true } });

      return reply.send({
        leaderboard,
        total_participants: totalParticipants.length,
        global_total_km: Math.round(((globalSum._sum.distanceMeters || 0) / 1000) * 100) / 100,
        user_rank: userRank,
      });
    }
  );

  // GET /v1/leaderboard/friends/:userId - 好友排行榜
  app.get<{ Params: { userId: string }; Querystring: { limit?: string } }>(
    '/friends/:userId',
    async (req, reply) => {
      const { userId } = req.params;
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);

      // 获取好友 ID
      const relations = await prisma.friend.findMany({
        where: { OR: [{ userId }, { friendId: userId }], status: 'accepted' },
      });
      const friendIds = relations.map((r) => r.userId === userId ? r.friendId : r.userId);
      friendIds.push(userId); // 包含自己

      // 好友的跑量统计（SQL SUM）
      const stats = await prisma.activity.groupBy({
        by: ['userId'],
        where: { userId: { in: friendIds } },
        _sum: { distanceMeters: true },
        _count: true,
        orderBy: { _sum: { distanceMeters: 'desc' } },
        take: limit,
      });

      const users = await prisma.user.findMany({
        where: { id: { in: stats.map((s) => s.userId) } },
        select: { id: true, nickname: true, avatar: true, avatarUrl: true, level: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      const leaderboard = stats.map((s, i) => ({
        rank: i + 1,
        user_id: s.userId,
        nickname: userMap.get(s.userId)?.nickname || '跑者',
        avatar: userMap.get(s.userId)?.avatar || 'default',
        level: userMap.get(s.userId)?.level || 1,
        total_distance_km: Math.round(((s._sum.distanceMeters || 0) / 1000) * 100) / 100,
        run_count: s._count,
      }));

      return reply.send({ leaderboard, total_participants: friendIds.length });
    }
  );

  done();
}
