import Fastify, { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { userRoutes } from './routes/users.js';
import { activityRoutes } from './routes/activities.js';
import { syncRoutes } from './routes/sync.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { inviteRoutes } from './routes/invite.js';
import { authRoutes } from './routes/auth.js';
import { friendRoutes } from './routes/friends.js';
import { feedRoutes } from './routes/feed.js';
import { phoneAuthRoutes } from './routes/phoneAuth.js';
import { eventRoutes } from './routes/events.js';
import { prisma } from './services/db.js';

const isProduction = process.env.NODE_ENV === 'production';

const server = Fastify({
  logger: isProduction
    ? { level: process.env.LOG_LEVEL || 'info' }
    : {
        transport: {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
        },
      },
});

// CORS — 支持白名单配置
const corsOrigin = process.env.CORS_ORIGIN || '*';
server.register(cors, {
  origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((s) => s.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// 统一错误处理
server.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
  const statusCode = error.statusCode || 500;

  // 生产环境不暴露错误堆栈
  const response: Record<string, unknown> = {
    error: true,
    message: isProduction ? 'Internal Server Error' : error.message,
    statusCode,
  };

  if (!isProduction && error.stack) {
    response.stack = error.stack;
  }

  // 不打印完整错误详情到日志
  _request.log.warn({ statusCode, path: _request.url }, 'Request error');
  reply.status(statusCode).send(response);
});

// Register routes
server.register(userRoutes, { prefix: '/v1/users' });
server.register(activityRoutes, { prefix: '/v1/activities' });
server.register(syncRoutes, { prefix: '/v1/sync' });
server.register(leaderboardRoutes, { prefix: '/v1/leaderboard' });
server.register(inviteRoutes, { prefix: '/v1/invite' });
server.register(authRoutes, { prefix: '/v1/auth' });
server.register(friendRoutes, { prefix: '/v1/friends' });
server.register(feedRoutes, { prefix: '/v1/feed' });
server.register(phoneAuthRoutes, { prefix: '/v1/auth/phone' });
server.register(eventRoutes, { prefix: '/v1/events' });

// Health check — 含数据库连通性
server.get('/health', async (_req, reply) => {
  try {
    // 轻量数据库连通性检查
    await prisma.$queryRaw`SELECT 1`;
    return reply.send({
      status: 'ok',
      database: 'connected',
      time: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    return reply.status(503).send({
      status: 'degraded',
      database: 'disconnected',
      time: new Date().toISOString(),
      error: isProduction ? 'Database unavailable' : String(err),
    });
  }
});

const start = async () => {
  const port = parseInt(process.env.PORT || '3001', 10);
  try {
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${port} (${isProduction ? 'production' : 'development'})`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
