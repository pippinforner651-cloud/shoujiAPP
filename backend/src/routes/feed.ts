import type { FastifyInstance } from 'fastify';
import { prisma } from '../services/db.js';

export function feedRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  // POST /v1/feed/create - 创建动态
  app.post<{ Body: {
    user_id: string; feed_type: string; content: string; activity_id?: string;
  } }>('/create', async (req, reply) => {
    const { user_id, feed_type, content, activity_id } = req.body;
    if (!user_id || !feed_type || !content) {
      return reply.status(400).send({ error: 'user_id, feed_type, content required' });
    }

    const feed = await prisma.activityFeed.create({
      data: { userId: user_id, feedType: feed_type, content, activityId: activity_id },
    });

    return reply.send({ id: feed.id, created_at: feed.createdAt });
  });

  // GET /v1/feed/friends/:userId - 好友动态（好友的跑步/成就）
  app.get<{ Params: { userId: string }; Querystring: { limit?: string } }>(
    '/friends/:userId',
    async (req, reply) => {
      const { userId } = req.params;
      const limit = Math.min(parseInt(req.query.limit || '30', 10), 50);

      // 获取好友 ID 列表
      const relations = await prisma.friend.findMany({
        where: { OR: [{ userId }, { friendId: userId }], status: 'accepted' },
      });
      const friendIds = relations.map((r) => r.userId === userId ? r.friendId : r.userId);
      friendIds.push(userId); // 包含自己的动态

      const feeds = await prisma.activityFeed.findMany({
        where: { userId: { in: friendIds } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, nickname: true, avatar: true, avatarUrl: true } },
        },
      });

      return reply.send({
        feeds: feeds.map((f) => ({
          id: f.id,
          user_id: f.userId,
          nickname: f.user.nickname,
          avatar: f.user.avatar,
          avatar_url: f.user.avatarUrl,
          feed_type: f.feedType,
          content: f.content,
          created_at: f.createdAt,
        })),
      });
    }
  );

  // GET /v1/feed/user/:userId - 用户个人动态
  app.get<{ Params: { userId: string }; Querystring: { limit?: string } }>(
    '/user/:userId',
    async (req, reply) => {
      const { userId } = req.params;
      const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);

      const feeds = await prisma.activityFeed.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return reply.send({
        feeds: feeds.map((f) => ({
          id: f.id, feed_type: f.feedType, content: f.content, created_at: f.createdAt,
        })),
      });
    }
  );

  done();
}
