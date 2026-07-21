// 第三方运动平台通用 OAuth 路由：/api/providers/:provider/（joyrun | huawei | garmin）
// 安全要求落实：
//  - access/refresh token 加密存储（AES-256-GCM），客户端永不接触 client_secret 与用户令牌
//  - OAuth state：一次性（OAuthState 表防重放）、10 分钟短时效、JWT 绑定用户
//  - 回调地址白名单校验（CALLBACK_ALLOWED_HOSTS）
//  - 断开连接：调用平台撤销（支持的平台）+ 本地凭据清除 + state 清除
//  - 审计只记录脱敏 openId，不记录令牌与隐私数据
import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CONFIG } from '../config.js';
import { getProvider, PROVIDER_KEYS, type ProviderAdapter } from '../services/providers.js';
import { encryptSecret, decryptSecret, maskId } from '../services/crypto.js';
import { createOne } from './activities.js';

const syncSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 回调地址白名单：仅允许配置主机（防止把授权码引到攻击者域名） */
function assertCallbackAllowed(p: ProviderAdapter, redirectUri: string): void {
  const allowed = (process.env.CALLBACK_ALLOWED_HOSTS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return; // 未配置白名单时以各平台 REDIRECT_URI 为准（开发态）
  const host = new URL(redirectUri).host;
  if (!allowed.includes(host)) {
    throw Object.assign(new Error(`回调地址主机不在白名单：${host}`), { code: 'CALLBACK_NOT_ALLOWED' });
  }
}

function providerRedirectUri(key: string): string {
  const env = {
    joyrun: process.env.JOYRUN_REDIRECT_URI,
    huawei: process.env.HUAWEI_REDIRECT_URI,
    garmin: process.env.GARMIN_REDIRECT_URI,
  }[key];
  return env ?? '';
}

async function issueState(app: FastifyInstance, userId: string, provider: string): Promise<string> {
  const jti = randomBytes(12).toString('hex');
  await app.prisma.oAuthState.create({
    data: { id: jti, userId, provider, expiresAt: new Date(Date.now() + 10 * 60_000) },
  });
  const user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return app.jwt.sign({ sub: userId, role: user.role, status: user.status, jti } as never, { expiresIn: '10m' });
}

/** 消费 state：验签 + 一次性（防重放） + 绑定用户与平台 */
async function consumeState(app: FastifyInstance, state: string, provider: string): Promise<{ userId: string } | { error: string }> {
  let payload: { sub: string; jti?: string };
  try {
    payload = app.jwt.verify<{ sub: string; jti?: string }>(state);
  } catch {
    return { error: '授权状态无效或已过期，请重新发起授权' };
  }
  if (!payload.jti) return { error: '授权状态格式非法' };
  const row = await app.prisma.oAuthState.findUnique({ where: { id: payload.jti } });
  if (!row || row.provider !== provider || row.userId !== payload.sub) return { error: '授权状态不匹配' };
  if (row.usedAt) return { error: '授权状态已被使用（防重放）' };
  if (row.expiresAt.getTime() < Date.now()) return { error: '授权状态已过期' };
  await app.prisma.oAuthState.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return { userId: payload.sub };
}

export async function providerRoutes(app: FastifyInstance) {
  // 平台清单（含各平台凭据配置状态）
  app.get('/', { preHandler: [app.authenticate] }, async (req) => {
    const conns = await app.prisma.externalConnection.findMany({ where: { userId: req.user.sub } });
    return {
      providers: PROVIDER_KEYS.map((key) => {
        const p = getProvider(key)!;
        const c = conns.find((x) => x.provider === key);
        return {
          key, name: p.name, enabled: p.enabled(), connected: Boolean(c && c.accessToken !== 'PENDING'),
          lastSyncAt: c?.lastSyncAt?.toISOString() ?? null,
          connectedAt: c?.createdAt.toISOString() ?? null,
        };
      }),
    };
  });

  app.get('/:provider/status', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const p = getProvider(provider);
    if (!p) return reply.code(404).send({ error: 'PROVIDER_UNKNOWN', message: '不支持的平台' });
    const conn = await app.prisma.externalConnection.findUnique({ where: { userId_provider: { userId: req.user.sub, provider } } });
    return {
      provider, name: p.name, enabled: p.enabled(), connected: Boolean(conn && conn.accessToken !== 'PENDING'),
      lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
      connectedAt: conn?.createdAt.toISOString() ?? null,
    };
  });

  // 生成授权跳转地址（state：一次性 + 短时效 + 绑定用户；回调白名单校验）
  app.get('/:provider/authorize-url', { preHandler: [app.requireApproved] }, async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const p = getProvider(provider);
    if (!p) return reply.code(404).send({ error: 'PROVIDER_UNKNOWN', message: '不支持的平台' });
    if (!p.enabled()) {
      return reply.code(503).send({ error: 'PROVIDER_NOT_ENABLED', message: `班级尚未完成${p.name}开放平台凭据申请与配置，暂不可授权` });
    }
    try {
      assertCallbackAllowed(p, providerRedirectUri(provider));
    } catch (e) {
      return reply.code(500).send({ error: 'CALLBACK_NOT_ALLOWED', message: (e as Error).message });
    }
    const state = await issueState(app, req.user.sub, provider);
    const r = await p.getAuthorizationUrl({
      state,
      storeRequestSecret: async (secret) => {
        await app.prisma.externalConnection.upsert({
          where: { userId_provider: { userId: req.user.sub, provider } },
          create: { userId: req.user.sub, provider, openId: 'PENDING', accessToken: 'PENDING', tokenSecret: encryptSecret(secret) },
          update: { tokenSecret: encryptSecret(secret), accessToken: 'PENDING', openId: 'PENDING' },
        });
      },
    });
    if (!r.ok) return reply.code(502).send({ error: 'PROVIDER_UPSTREAM', message: r.message });
    return { url: r.value.url };
  });

  // OAuth 回调（消费一次性 state；令牌加密入库；审计脱敏）
  app.get('/:provider/callback', async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const q = req.query as Record<string, string | undefined>;
    const back = CONFIG.FRONTEND_URL || '/';
    const fail = () => reply.redirect(`${back}${back.includes('?') ? '&' : '?'}oauth=${provider}:failed`);
    const p = getProvider(provider);
    if (!p) return reply.code(404).send({ error: 'PROVIDER_UNKNOWN', message: '不支持的平台' });
    if (!q.state) return fail();

    const consumed = await consumeState(app, q.state, provider);
    if ('error' in consumed) {
      return reply.code(400).send({ error: 'BAD_STATE', message: consumed.error });
    }
    const userId = consumed.userId;

    const pending = await app.prisma.externalConnection.findUnique({ where: { userId_provider: { userId, provider } } });
    const r = await p.exchangeAuthorization({
      code: q.code,
      oauthToken: q.oauth_token,
      oauthVerifier: q.oauth_verifier,
      requestSecret: decryptSecret(pending?.tokenSecret ?? null),
    });
    if (!r.ok) {
      req.log.warn({ provider, err: r.message }, 'provider callback exchange failed'); // 不记录令牌
      return fail();
    }
    const t = r.value;
    await app.prisma.externalConnection.upsert({
      where: { userId_provider: { userId, provider } },
      create: { userId, provider, openId: t.openId, accessToken: encryptSecret(t.accessToken)!, tokenSecret: encryptSecret(t.tokenSecret), refreshToken: encryptSecret(t.refreshToken), expiresAt: t.expiresAt },
      update: { openId: t.openId, accessToken: encryptSecret(t.accessToken)!, tokenSecret: encryptSecret(t.tokenSecret), refreshToken: encryptSecret(t.refreshToken), expiresAt: t.expiresAt },
    });
    await app.prisma.auditLog.create({ data: { actorId: userId, action: 'PROVIDER_CONNECTED', detail: `${provider} openId=${maskId(t.openId)}` } });
    return reply.redirect(`${back}${back.includes('?') ? '&' : '?'}oauth=${provider}:connected`);
  });

  // 手动触发同步（解密令牌仅存在于内存；可信通道计入；幂等）
  app.post('/:provider/sync', { preHandler: [app.requireApproved] }, async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const p = getProvider(provider);
    if (!p) return reply.code(404).send({ error: 'PROVIDER_UNKNOWN', message: '不支持的平台' });
    if (!p.enabled()) return reply.code(503).send({ error: 'PROVIDER_NOT_ENABLED', message: `班级尚未完成${p.name}凭据配置` });

    const conn = await app.prisma.externalConnection.findUnique({ where: { userId_provider: { userId: req.user.sub, provider } } });
    if (!conn || conn.accessToken === 'PENDING') {
      return reply.code(409).send({ error: 'PROVIDER_NOT_CONNECTED', message: `请先完成${p.name}授权连接` });
    }

    const parsed = syncSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'BAD_REQUEST', message: '日期格式应为 YYYY-MM-DD' });
    const cursor = {
      to: parsed.data.to ?? todayStr(),
      from: parsed.data.from ?? (conn.lastSyncAt
        ? conn.lastSyncAt.toISOString().slice(0, 10)
        : new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)),
    };

    const secrets = {
      accessToken: decryptSecret(conn.accessToken)!,
      tokenSecret: decryptSecret(conn.tokenSecret),
      refreshToken: decryptSecret(conn.refreshToken),
    };
    const r = await p.pullActivities(secrets, cursor);
    if (!r.ok) {
      const info = p.mapProviderError(new Error(r.message));
      return reply.code(502).send({ error: 'PROVIDER_UPSTREAM', message: info.message, retryable: info.retryable });
    }

    let imported = 0, duplicated = 0, pending = 0, rejected = 0;
    const details: { runId: string; status: string; distanceM: number }[] = [];
    for (const run of r.value.runs) {
      const result = await createOne(app, req.user.sub, {
        clientId: `${provider}-${run.runId}`,
        source: provider === 'garmin' ? 'watch' : 'joyrun',
        distanceM: run.distanceM,
        durationSec: run.durationSec,
        startedAt: run.startedAt,
        endedAt: run.endedAt,
        evidenceNote: `${p.name}官方API同步（runId=${run.runId}）`,
      }, { trusted: true });
      if (result.duplicated) duplicated++;
      else if (result.activity.status === 'valid') imported++;
      else if (result.activity.status === 'pending') pending++;
      else rejected++;
      details.push({ runId: run.runId, status: result.duplicated ? 'duplicated' : result.activity.status, distanceM: run.distanceM });
    }

    await app.prisma.externalConnection.update({ where: { userId_provider: { userId: req.user.sub, provider } }, data: { lastSyncAt: new Date() } });
    await app.prisma.auditLog.create({
      data: { actorId: req.user.sub, action: 'PROVIDER_SYNCED', detail: `${provider} from=${cursor.from} to=${cursor.to} imported=${imported} dup=${duplicated} pending=${pending} rejected=${rejected}` },
    });
    return { provider, from: cursor.from, to: cursor.to, total: r.value.runs.length, imported, duplicated, pending, rejected, details };
  });

  // 断开连接：平台撤销（支持的平台）→ 本地凭据清除 → state 清除 → 审计（不含隐私数据）
  app.post('/:provider/disconnect', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const p = getProvider(provider);
    if (!p) return reply.code(404).send({ error: 'PROVIDER_UNKNOWN', message: '不支持的平台' });
    const conn = await app.prisma.externalConnection.findUnique({ where: { userId_provider: { userId: req.user.sub, provider } } });
    let revoked: boolean | 'not_supported' = false;
    if (conn && conn.accessToken !== 'PENDING' && p.enabled()) {
      const secrets = {
        accessToken: decryptSecret(conn.accessToken)!,
        tokenSecret: decryptSecret(conn.tokenSecret),
        refreshToken: decryptSecret(conn.refreshToken),
      };
      const r = await p.revokeAuthorization(secrets);
      revoked = r.ok ? r.value.revoked : r.code === 'not_supported' ? 'not_supported' : false;
      if (!r.ok && r.code !== 'not_supported') {
        req.log.warn({ provider }, 'provider revoke failed, local purge continues'); // 不记录令牌
      }
    }
    await app.prisma.externalConnection.deleteMany({ where: { userId: req.user.sub, provider } });
    await app.prisma.oAuthState.deleteMany({ where: { userId: req.user.sub, provider } });
    await app.prisma.auditLog.create({ data: { actorId: req.user.sub, action: 'PROVIDER_DISCONNECTED', detail: `${provider} revoked=${revoked}` } });
    return { ok: true, revoked };
  });

  // Webhook 接收端：逐平台验签；不支持的平台如实返回 501 not_supported
  app.post('/:provider/webhook', async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const p = getProvider(provider);
    if (!p) return reply.code(404).send({ error: 'PROVIDER_UNKNOWN', message: '不支持的平台' });
    const rawBody = JSON.stringify(req.body ?? {});
    const verify = await p.verifyWebhookSignature(req.headers as Record<string, unknown>, rawBody);
    if (!verify.ok) {
      return reply.code(501).send({ error: 'NOT_SUPPORTED', message: verify.message });
    }
    if (!verify.value.valid) {
      return reply.code(401).send({ error: 'BAD_SIGNATURE', message: 'Webhook 验签失败' });
    }
    const handled = await p.handleWebhook(req.headers as Record<string, unknown>, rawBody);
    if (!handled.ok) return reply.code(501).send({ error: 'NOT_SUPPORTED', message: handled.message });
    return { ok: true, events: handled.value.events.length };
  });
}
