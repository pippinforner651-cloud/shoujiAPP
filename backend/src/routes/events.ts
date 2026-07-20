import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from '../services/db.js';

const VALID_EVENTS = ['login', 'open_map', 'run', 'share', 'invite', 'unlock_city'];

export function eventRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  // POST /v1/events/track - 记录用户事件
  app.post<{ Body: { user_id: string; event_type: string; metadata?: Prisma.InputJsonValue } }>(
    '/track', async (req, reply) => {
      const { user_id, event_type, metadata } = req.body;
      if (!user_id || !event_type) return reply.status(400).send({ error: 'user_id and event_type required' });
      if (!VALID_EVENTS.includes(event_type)) return reply.status(400).send({ error: `invalid event_type: ${event_type}` });

      await prisma.userEvent.create({
        data: { userId: user_id, eventType: event_type, metadata: metadata || undefined },
      });

      return reply.send({ success: true });
    }
  );

  // GET /v1/events/user/:userId - 获取用户事件历史
  app.get<{ Params: { userId: string }; Querystring: { limit?: string; event_type?: string } }>(
    '/user/:userId', async (req, reply) => {
      const { userId } = req.params;
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);

      const where: { userId: string; eventType?: string } = { userId };
      if (req.query.event_type) where.eventType = req.query.event_type;

      const events = await prisma.userEvent.findMany({
        where, orderBy: { createdAt: 'desc' }, take: limit,
      });

      return reply.send({
        events: events.map((e) => ({
          id: e.id, event_type: e.eventType, metadata: e.metadata, created_at: e.createdAt,
        })),
      });
    }
  );

  done();
}
