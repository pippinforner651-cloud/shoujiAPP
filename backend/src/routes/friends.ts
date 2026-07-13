import type { FastifyInstance } from 'fastify';
import { prisma } from '../services/db.js';

export function friendRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  // POST /v1/friends/request - 发送好友申请
  app.post<{ Body: { user_id: string; friend_id: string } }>('/request', async (req, reply) => {
    const { user_id, friend_id } = req.body;
    if (!user_id || !friend_id) return reply.status(400).send({ error: 'user_id and friend_id required' });
    if (user_id === friend_id) return reply.status(400).send({ error: '不能添加自己为好友' });

    const existing = await prisma.friend.findUnique({
      where: { userId_friendId: { userId: user_id, friendId: friend_id } },
    });
    if (existing) return reply.status(400).send({ error: '好友关系已存在' });

    await prisma.friend.create({
      data: { userId: user_id, friendId: friend_id, status: 'pending' },
    });

    return reply.send({ success: true, status: 'pending' });
  });

  // POST /v1/friends/accept - 接受好友申请
  app.post<{ Body: { user_id: string; friend_id: string } }>('/accept', async (req, reply) => {
    const { user_id, friend_id } = req.body;

    // 更新对方发来的申请
    const record = await prisma.friend.findUnique({
      where: { userId_friendId: { userId: friend_id, friendId: user_id } },
    });
    if (!record) return reply.status(404).send({ error: '好友申请不存在' });

    // 更新状态
    await prisma.friend.update({
      where: { userId_friendId: { userId: friend_id, friendId: user_id } },
      data: { status: 'accepted' },
    });

    // 创建双向关系
    await prisma.friend.upsert({
      where: { userId_friendId: { userId: user_id, friendId: friend_id } },
      update: { status: 'accepted' },
      create: { userId: user_id, friendId: friend_id, status: 'accepted' },
    });

    return reply.send({ success: true, status: 'accepted' });
  });

  // POST /v1/friends/reject - 拒绝好友申请
  app.post<{ Body: { user_id: string; friend_id: string } }>('/reject', async (req, reply) => {
    const { user_id, friend_id } = req.body;
    await prisma.friend.updateMany({
      where: { userId: friend_id, friendId: user_id, status: 'pending' },
      data: { status: 'rejected' },
    });
    return reply.send({ success: true, status: 'rejected' });
  });

  // GET /v1/friends/list/:userId - 好友列表
  app.get<{ Params: { userId: string }; Querystring: { status?: string } }>(
    '/list/:userId',
    async (req, reply) => {
      const { userId } = req.params;
      const status = req.query.status || 'accepted';

      const relations = await prisma.friend.findMany({
        where: {
          OR: [{ userId }, { friendId: userId }],
          status,
        },
      });

      const friendIds = relations.map((r) => r.userId === userId ? r.friendId : r.userId);

      const friends = friendIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: friendIds } },
            select: { id: true, nickname: true, avatar: true, avatarUrl: true, level: true },
          })
        : [];

      // 获取好友的跑量统计
      const stats = await prisma.activity.groupBy({
        by: ['userId'],
        where: { userId: { in: friendIds } },
        _sum: { distanceKm: true },
        _count: true,
      });
      const statsMap = new Map(stats.map((s) => [s.userId, s]));

      const result = friends.map((f) => ({
        id: f.id,
        nickname: f.nickname,
        avatar: f.avatar,
        avatar_url: f.avatarUrl,
        level: f.level,
        total_distance_km: Math.round((statsMap.get(f.id)?._sum.distanceKm || 0) * 100) / 100,
        run_count: statsMap.get(f.id)?._count || 0,
      }));

      return reply.send({ friends: result, total: result.length });
    }
  );

  // DELETE /v1/friends/remove - 删除好友
  app.delete<{ Querystring: { user_id: string; friend_id: string } }>(
    '/remove',
    async (req, reply) => {
      const { user_id, friend_id } = req.query;
      await prisma.friend.deleteMany({
        where: {
          OR: [
            { userId: user_id, friendId: friend_id },
            { userId: friend_id, friendId: user_id },
          ],
        },
      });
      return reply.send({ success: true });
    }
  );

  done();
}
