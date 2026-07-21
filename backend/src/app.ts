// Fastify 应用工厂：buildApp(databaseUrl) 供 server 与测试共用
import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import { CONFIG } from './config.js';
import { authRoutes } from './routes/auth.js';
import { activityRoutes } from './routes/activities.js';
import { providerRoutes } from './routes/providers.js';
import { integrationRoutes } from './routes/integrations.js';
import { classRoutes } from './routes/class.js';
import { adminRoutes } from './routes/admin.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: 'member' | 'admin'; status: 'pending' | 'approved' | 'rejected' };
    user: { sub: string; role: 'member' | 'admin'; status: 'pending' | 'approved' | 'rejected' };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireApproved: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function buildApp(databaseUrl?: string): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  const prisma = new PrismaClient(
    databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined,
  );
  app.decorate('prisma', prisma);

  // CORS 白名单：生产环境必须显式配置来源，禁止 '*' 裸奔
  const corsOrigin = CONFIG.CORS_ORIGIN === '*'
    ? (process.env.NODE_ENV === 'production' ? false : true)
    : CONFIG.CORS_ORIGIN.split(',').map((s) => s.trim());
  if (CONFIG.CORS_ORIGIN === '*' && process.env.NODE_ENV === 'production') {
    app.log.warn('CORS_ORIGIN 未配置：生产环境默认拒绝跨域，请显式配置白名单');
  }
  await app.register(cors, { origin: corsOrigin });
  // 全局限流：每 IP 每分钟 RATE_LIMIT_MAX 次，超限 429
  await app.register(rateLimit, { max: CONFIG.RATE_LIMIT_MAX, timeWindow: CONFIG.RATE_LIMIT_WINDOW });
  await app.register(jwt, { secret: CONFIG.JWT_SECRET, sign: { expiresIn: CONFIG.JWT_EXPIRES } });

  // 认证：仅校验 JWT 合法
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: '未登录或登录已过期' });
    }
  });

  // 已审批成员：pending/rejected 用户只读，不可贡献数据
  app.decorate('requireApproved', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: '未登录或登录已过期' });
    }
    const u = await app.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!u || u.status !== 'approved') {
      return reply.code(403).send({
        error: 'NOT_APPROVED',
        message: '账号待管理员审批，审批通过后才能贡献跑量',
        status: u?.status ?? 'unknown',
      });
    }
  });

  app.decorate('requireAdmin', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: '未登录或登录已过期' });
    }
    if (req.user.role !== 'admin') {
      return reply.code(403).send({ error: 'FORBIDDEN', message: '需要管理员权限' });
    }
  });

  app.get('/api/health', async () => {
    let db = 'down';
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
    return { ok: true, service: 'e23-backend', db, serverTime: new Date().toISOString() };
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(activityRoutes, { prefix: '/api/activities' });
  await app.register(classRoutes, { prefix: '/api/class' });
  await app.register(providerRoutes, { prefix: '/api/providers' });
  await app.register(integrationRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}
