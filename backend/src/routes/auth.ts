/**
 * 微信登录真实性边界。
 *
 * 正式微信开放平台资质、AppID、签名和服务端密钥尚未配置时，
 * 后端必须明确拒绝登录，不能根据任意code生成openid、用户或token。
 */

import type { FastifyInstance } from 'fastify';

const unavailable = {
  error: 'WECHAT_NOT_CONFIGURED',
  message: '微信开放平台尚未配置，当前不能进行真实微信授权。',
};

export function authRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  app.post('/wechat/login', async (_request, reply) => {
    return reply.status(503).send(unavailable);
  });

  app.post('/wechat/bind', async (_request, reply) => {
    return reply.status(503).send(unavailable);
  });

  done();
}
