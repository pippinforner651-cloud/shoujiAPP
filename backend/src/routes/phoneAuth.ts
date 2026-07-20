import type { FastifyInstance, FastifyReply } from 'fastify';

const phoneAuthNotConfigured = (reply: FastifyReply) => reply.status(503).send({
  error: 'PHONE_AUTH_NOT_CONFIGURED',
  message: '正式版未开放手机号短信登录；当前不会发送短信、创建用户或签发登录令牌。',
});

export function phoneAuthRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  app.post('/send-code', async (_request, reply) => phoneAuthNotConfigured(reply));
  app.post('/register', async (_request, reply) => phoneAuthNotConfigured(reply));
  app.post('/login', async (_request, reply) => phoneAuthNotConfigured(reply));

  done();
}
