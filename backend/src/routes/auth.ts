// 认证与用户：注册（邀请码）/登录/个人资料
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const registerSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确'),
  password: z.string().min(6, '密码至少 6 位').max(72),
  nickname: z.string().min(1).max(24),
  inviteCode: z.string().min(1, '必须填写邀请码'),
});

const loginSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/),
  password: z.string().min(1),
});

const patchMeSchema = z.object({
  nickname: z.string().min(1).max(24).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});

function maskPhone(phone: string): string {
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

function publicUser(u: { id: string; phone: string; nickname: string; avatarUrl: string | null; role: string; status: string; createdAt: Date }) {
  return {
    id: u.id,
    phone: maskPhone(u.phone),
    nickname: u.nickname,
    avatarUrl: u.avatarUrl,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function authRoutes(app: FastifyInstance) {
  // 注册：校验邀请码 → 创建 pending 用户 → 发 token（可登录但不可贡献）
  app.post('/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message ?? '参数错误' });
    }
    const { phone, password, nickname, inviteCode } = parsed.data;

    const exists = await app.prisma.user.findUnique({ where: { phone } });
    if (exists) {
      return reply.code(409).send({ error: 'PHONE_TAKEN', message: '该手机号已注册，请直接登录' });
    }

    const code = await app.prisma.inviteCode.findUnique({ where: { code: inviteCode } });
    if (!code) {
      return reply.code(400).send({ error: 'INVITE_INVALID', message: '邀请码不存在' });
    }
    if (code.expiresAt && code.expiresAt < new Date()) {
      return reply.code(400).send({ error: 'INVITE_EXPIRED', message: '邀请码已过期' });
    }
    if (code.usedCount >= code.maxUses) {
      return reply.code(400).send({ error: 'INVITE_EXHAUSTED', message: '邀请码使用次数已用完' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await app.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { phone, nickname, passwordHash, inviteCodeId: code.id, status: 'pending' },
      });
      await tx.inviteCode.update({ where: { id: code.id }, data: { usedCount: { increment: 1 } } });
      await tx.auditLog.create({ data: { actorId: u.id, action: 'USER_REGISTERED', targetId: u.id, detail: `invite=${code.code}` } });
      return u;
    });

    const token = app.jwt.sign({ sub: user.id, role: user.role, status: user.status });
    return reply.code(201).send({ token, user: publicUser(user) });
  });

  app.post('/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: '参数错误' });
    }
    const { phone, password } = parsed.data;
    const user = await app.prisma.user.findUnique({ where: { phone } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.code(401).send({ error: 'BAD_CREDENTIALS', message: '手机号或密码错误' });
    }
    const token = app.jwt.sign({ sub: user.id, role: user.role, status: user.status });
    return { token, user: publicUser(user) };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const u = await app.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!u) return reply.code(404).send({ error: 'NOT_FOUND', message: '用户不存在' });
    return { user: publicUser(u) };
  });

  app.patch('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = patchMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: '参数错误' });
    }
    const u = await app.prisma.user.update({ where: { id: req.user.sub }, data: parsed.data });
    return { user: publicUser(u) };
  });
}
