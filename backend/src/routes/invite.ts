import type { FastifyInstance } from 'fastify';
import { prisma } from '../services/db.js';
import crypto from 'crypto';

export function inviteRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  // POST /v1/invite/create - 生成邀请码
  app.post<{ Body: { user_id: string } }>('/create', async (req, reply) => {
    const { user_id } = req.body;
    if (!user_id) return reply.status(400).send({ error: 'user_id required' });

    // 检查是否已有邀请码
    const existing = await prisma.user.findUnique({ where: { id: user_id }, select: { inviteCode: true } });
    if (existing?.inviteCode) {
      return reply.send({ code: existing.inviteCode });
    }

    // 生成新码
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    await prisma.user.update({ where: { id: user_id }, data: { inviteCode: code } });

    await prisma.inviteCode.create({
      data: { code, senderId: user_id },
    }).catch(() => {});

    return reply.send({ code });
  });

  // POST /v1/invite/use - 使用邀请码
  app.post<{ Body: { code: string; user_id: string } }>('/use', async (req, reply) => {
    const { code, user_id } = req.body;

    const invite = await prisma.inviteCode.findUnique({ where: { code } });
    if (!invite) return reply.status(404).send({ error: '无效的邀请码' });
    if (invite.usedBy) return reply.status(400).send({ error: '邀请码已被使用' });
    if (invite.senderId === user_id) return reply.status(400).send({ error: '不能使用自己的邀请码' });

    await prisma.inviteCode.update({
      where: { code },
      data: { usedBy: user_id, usedAt: new Date() },
    });

    await prisma.user.update({
      where: { id: user_id },
      data: { invitedBy: invite.senderId },
    });

    return reply.send({ success: true, invited_by: invite.senderId });
  });

  // GET /v1/invite/stats/:userId - 邀请统计
  app.get<{ Params: { userId: string } }>('/stats/:userId', async (req, reply) => {
    const { userId } = req.params;

    const usedCount = await prisma.inviteCode.count({
      where: { senderId: userId, usedBy: { not: null } },
    });

    const invitedUsers = await prisma.user.findMany({
      where: { invitedBy: userId },
      select: { id: true, nickname: true, createdAt: true },
    });

    return reply.send({ used_count: usedCount, invited_users: invitedUsers });
  });

  done();
}
