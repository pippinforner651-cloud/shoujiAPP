import type { FastifyInstance } from 'fastify';
import { prisma } from '../services/db.js';

interface CreateUserBody {
  id: string;
  nickname?: string;
  avatar?: string;
  is_guest?: boolean;
}

interface UpdateUserBody {
  nickname?: string;
  avatar?: string;
  level?: number;
  experience?: number;
}

export function userRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  // POST /v1/users - 注册/创建用户
  app.post<{ Body: CreateUserBody }>('/', async (req, reply) => {
    const { id, nickname, avatar, is_guest } = req.body;
    if (!id) {
      return reply.status(400).send({ error: 'id is required' });
    }

    const user = await prisma.user.upsert({
      where: { id },
      update: { nickname: nickname || undefined, avatar: avatar || undefined },
      create: {
        id,
        nickname: nickname || '跑者',
        avatar: avatar || 'default',
        isGuest: is_guest ?? true,
      },
    });

    return reply.status(201).send(user);
  });

  // GET /v1/users/:id - 获取用户信息
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // 实时统计
    const stats = await prisma.activity.aggregate({
      where: { userId: id },
      _sum: { distanceKm: true },
      _count: true,
    });

    return reply.send({
      ...user,
      totalDistanceKm: stats._sum.distanceKm || 0,
      runCount: stats._count,
    });
  });

  // PUT /v1/users/:id - 更新用户信息
  app.put<{ Params: { id: string }; Body: UpdateUserBody }>('/:id', async (req, reply) => {
    const { id } = req.params;
    const { nickname, avatar, level, experience } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(nickname !== undefined && { nickname }),
        ...(avatar !== undefined && { avatar }),
        ...(level !== undefined && { level }),
        ...(experience !== undefined && { experience }),
      },
    });

    return reply.send(user);
  });

  done();
}
