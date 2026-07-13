import type { FastifyInstance } from 'fastify';
import { prisma } from '../services/db.js';

export function phoneAuthRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  // POST /v1/auth/phone/send-code - 发送验证码
  app.post<{ Body: { phone: string } }>('/send-code', async (req, reply) => {
    const { phone } = req.body;
    if (!phone || !/^1\d{10}$/.test(phone)) {
      return reply.status(400).send({ error: '请输入有效的手机号' });
    }
    // Mock: 验证码固定为 123456
    console.log(`[Mock SMS] Code for ${phone}: 123456`);
    return reply.send({ success: true, message: '验证码已发送', mock_code: '123456' });
  });

  // POST /v1/auth/phone/register - 手机号注册
  app.post<{ Body: { phone: string; code: string; real_name: string; nickname?: string } }>(
    '/register', async (req, reply) => {
      const { phone, code, real_name, nickname } = req.body;

      if (code !== '123456') return reply.status(400).send({ error: '验证码错误' });

      // 查重
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) return reply.status(400).send({ error: '该手机号已注册' });

      const id = `phone_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      const user = await prisma.user.create({
        data: {
          id,
          nickname: nickname || real_name || '跑者',
          realName: real_name,
          phone,
          phoneVerified: true,
          registerSource: 'phone',
          loginType: 'phone',
          isGuest: false,
          lastLoginAt: new Date(),
        },
      });

      return reply.send({
        user_id: user.id, nickname: user.nickname, token: `mock_token_${id}`,
      });
    }
  );

  // POST /v1/auth/phone/login - 手机号登录
  app.post<{ Body: { phone: string; code: string } }>('/login', async (req, reply) => {
    const { phone, code } = req.body;
    if (code !== '123456') return reply.status(400).send({ error: '验证码错误' });

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return reply.status(404).send({ error: '用户不存在，请先注册' });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return reply.send({
      user_id: user.id, nickname: user.nickname, token: `mock_token_${user.id}`,
    });
  });

  done();
}
