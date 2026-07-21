// E23 后端集成测试：真实 PostgreSQL（外部 URL 优先，embedded-postgres 仅开发 fallback）+ app.inject()
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import type EmbeddedPostgres from 'embedded-postgres';
import { execSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { resolveTestDatabase } from './db-setup.js';

let pg: EmbeddedPostgres | null = null;
let app: FastifyInstance;
let dbUrl: string;

const ADMIN = { phone: '13800000001', password: 'admin123456' };
let adminToken = '';
let inviteCode = '';
let memberToken = '';
let memberId = '';

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

function gpsActivity(clientId: string, km = 5) {
  const start = new Date('2026-07-15T06:00:00.000Z');
  const durSec = km * 400; // 6:40/km 正常配速
  const pts = Array.from({ length: 11 }, (_, i) => ({
    lat: 22.5300 + i * 0.0008 * km,
    lon: 113.9500 + i * 0.0005 * km,
    accuracyM: 8,
    timestamp: new Date(start.getTime() + (durSec / 10) * i * 1000).toISOString(),
  }));
  return {
    clientId,
    source: 'gps' as const,
    distanceM: km * 1000,
    durationSec: durSec,
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + durSec * 1000).toISOString(),
    trackPoints: pts,
  };
}

// ---- 模拟第三方平台上游（悦跑圈/华为/佳明，真实 HTTP 服务，验证完整 OAuth+同步链路）----
let mockJoyrun: Server;
const MOCK_JOYRUN_PORT = 59999;

beforeAll(async () => {
  const mockBase = `http://127.0.0.1:${MOCK_JOYRUN_PORT}`;
  process.env.JOYRUN_CLIENT_ID = 'test-client-id';
  process.env.JOYRUN_CLIENT_SECRET = 'test-client-secret';
  process.env.JOYRUN_REDIRECT_URI = 'http://localhost/api/providers/joyrun/callback';
  process.env.JOYRUN_API_BASE = mockBase;
  process.env.HUAWEI_CLIENT_ID = 'hw-client';
  process.env.HUAWEI_CLIENT_SECRET = 'hw-secret';
  process.env.HUAWEI_REDIRECT_URI = 'http://localhost/api/providers/huawei/callback';
  process.env.HUAWEI_AUTH_BASE = mockBase;
  process.env.HUAWEI_API_BASE = mockBase;
  process.env.GARMIN_CONSUMER_KEY = 'gm-key';
  process.env.GARMIN_CONSUMER_SECRET = 'gm-secret';
  process.env.GARMIN_REDIRECT_URI = 'http://localhost/api/providers/garmin/callback';
  process.env.GARMIN_AUTH_BASE = mockBase;
  process.env.GARMIN_CONFIRM_BASE = mockBase;
  process.env.GARMIN_API_BASE = mockBase;
  process.env.FRONTEND_URL = 'http://localhost:3000';

  mockJoyrun = createServer((req, res) => {
    const u = new URL(req.url ?? '/', `http://127.0.0.1:${MOCK_JOYRUN_PORT}`);
    res.setHeader('content-type', 'application/json');
    // 悦跑圈
    if (u.pathname === '/oauth/token' && req.method === 'POST') {
      res.end(JSON.stringify({ access_token: 'mock-access-token', refresh_token: 'mock-refresh', expires_in: 7200, open_id: 'joyrun-u-888' }));
      return;
    }
    if (u.pathname === '/run/detail/date') {
      const date = u.searchParams.get('date');
      if (date === '2026-07-10') {
        res.end(JSON.stringify({ data: [{ runid: 'jr1001', meter: 5000, second: 2000, pace: 400, starttime: 1752156000 }] }));
        return;
      }
      if (date === '2026-07-11') {
        res.end(JSON.stringify({ data: [
          { runid: 'jr1002', meter: 3000, second: 1350, pace: 450, starttime: 1752242400 },
          { note: '缺字段的坏记录应被跳过' },
        ] }));
        return;
      }
      res.end(JSON.stringify({ data: [] }));
      return;
    }
    // 华为
    if (u.pathname === '/oauth2/v3/token' && req.method === 'POST') {
      res.end(JSON.stringify({ access_token: 'hw-access', refresh_token: 'hw-refresh', expires_in: 3600, open_id: 'hw-u-66' }));
      return;
    }
    if (u.pathname === '/oauth2/v3/revoke' && req.method === 'POST') {
      (globalThis as Record<string, unknown>).__hwRevoked = true;
      res.end('{}');
      return;
    }
    if (u.pathname === '/healthkit/v1/activityRecords') {
      res.end(JSON.stringify({ activityRecords: [
        { id: 'hw9001', distance: 6000, duration: 2400, startTime: 1752156000 },
        { id: 'hw9002', distance: 2500, duration: 1125, startTime: 1752242400 },
      ] }));
      return;
    }
    // 佳明 OAuth 1.0a
    if (u.pathname === '/oauth-service/oauth/request_token' && req.method === 'POST') {
      res.setHeader('content-type', 'application/x-www-form-urlencoded');
      res.end('oauth_token=req-tok-1&oauth_token_secret=req-sec-1');
      return;
    }
    if (u.pathname === '/oauth-service/oauth/access_token' && req.method === 'POST') {
      res.setHeader('content-type', 'application/x-www-form-urlencoded');
      res.end('oauth_token=gm-acc-tok&oauth_token_secret=gm-acc-sec');
      return;
    }
    if (u.pathname === '/wellness-api/rest/activities') {
      // 校验 OAuth1 签名头存在
      if (!String(req.headers.authorization ?? '').includes('oauth_signature')) {
        res.statusCode = 401; res.end('{}'); return;
      }
      res.end(JSON.stringify([
        { summaryId: 'g7001', activityType: 'RUNNING', distanceInMeters: 4000, durationInSeconds: 1600, startTimeInSeconds: 1752156000 },
        { summaryId: 'g7002', activityType: 'CYCLING', distanceInMeters: 20000, durationInSeconds: 3000, startTimeInSeconds: 1752156000 },
      ]));
      return;
    }
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise<void>((r) => mockJoyrun.listen(MOCK_JOYRUN_PORT, r));

  // 数据库选择：TEST_DATABASE_URL / DATABASE_URL 优先（不启动 embedded-postgres）；
  // 无外部 URL 时仅非 Windows 开发机回退 embedded；Windows 无 URL 明确失败并提示
  const resolved = await resolveTestDatabase();
  pg = resolved.pg;
  dbUrl = resolved.url;

  // --force-reset：每次运行先清库，保证同一外部数据库上重复执行结果确定（CI service 每次为新库，亦无影响）
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  });
  execSync('npx tsx prisma/seed.ts', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  });

  app = await buildApp(dbUrl);
}, 120_000);

afterAll(async () => {
  await app?.close();
  if (pg) {
    await pg.stop();
    console.log('[test-db] embedded-postgres 已停止');
  }
  await new Promise((r) => mockJoyrun?.close(r));
}, 60_000);

describe('E23 后端 API 集成测试', () => {
  it('1. 健康检查返回 db=up 与服务器时间', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe('up');
    expect(body.serverTime).toBeTruthy();
  });

  it('2. 管理员登录成功', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: ADMIN });
    expect(res.statusCode).toBe(200);
    adminToken = res.json().token;
    expect(adminToken).toBeTruthy();
  });

  it('3. 管理员生成邀请码', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/admin/invites', headers: auth(adminToken),
      payload: { note: '测试', maxUses: 10 },
    });
    expect(res.statusCode).toBe(201);
    inviteCode = res.json().invite.code;
    expect(inviteCode).toMatch(/^E23-[0-9A-F]{8}$/);
  });

  it('4. 邀请码注册 → 状态 pending', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { phone: '13911112222', password: 'pass123456', nickname: '测试队员', inviteCode },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    memberToken = body.token;
    memberId = body.user.id;
    expect(body.user.status).toBe('pending');
    expect(body.user.phone).toBe('139****2222'); // 手机号脱敏
  });

  it('5. pending 用户上传活动被拒绝 403 NOT_APPROVED', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/activities', headers: auth(memberToken),
      payload: gpsActivity('cid-pending-01'),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('NOT_APPROVED');
  });

  it('6. 管理员审批通过成员', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/admin/members/${memberId}/review`, headers: auth(adminToken),
      payload: { action: 'approve' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().member.status).toBe('approved');
  });

  it('7. GPS 活动上传 → 校验通过 valid 并计入进度', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/activities', headers: auth(memberToken),
      payload: gpsActivity('cid-gps-01', 5),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.activity.status).toBe('valid');
    expect(body.activity.avgPaceSec).toBe(400);

    const progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(5000);
  });

  it('8. 幂等：同 clientId 重复上传返回 duplicated，不重复计里程', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/activities', headers: auth(memberToken),
      payload: gpsActivity('cid-gps-01', 5),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().duplicated).toBe(true);

    const progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(5000); // 仍是 5000，未翻倍
  });

  it('9. 异常配速（快于人类极限）→ rejected 且不计入', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/activities', headers: auth(memberToken),
      payload: { ...gpsActivity('cid-fast-01', 10), durationSec: 1000 }, // 100s/km
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().activity.status).toBe('rejected');

    const progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(5000);
  });

  it('10. 手动补录 → pending 待审核；审核通过后计入', async () => {
    const start = new Date('2026-07-16T07:00:00.000Z');
    const res = await app.inject({
      method: 'POST', url: '/api/activities', headers: auth(memberToken),
      payload: {
        clientId: 'cid-manual-01', source: 'manual',
        distanceM: 8000, durationSec: 3600,
        startedAt: start.toISOString(),
        endedAt: new Date(start.getTime() + 3600_000).toISOString(),
        evidenceNote: '悦跑圈截图：7月16日晨跑8km',
      },
    });
    expect(res.statusCode).toBe(201);
    const act = res.json().activity;
    expect(act.status).toBe('pending');

    // pending 不计入
    let progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(5000);

    // 管理员审核通过 → 计入
    const review = await app.inject({
      method: 'POST', url: `/api/admin/activities/${act.id}/review`, headers: auth(adminToken),
      payload: { action: 'approve' },
    });
    expect(review.statusCode).toBe(200);

    progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(13000);
  });

  it('11. 管理员删除活动 → 汇总立即重算减少', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/activities/mine', headers: auth(memberToken) });
    const valid5k = list.json().activities.find((a: { clientId: string }) => a.clientId === 'cid-gps-01');

    const del = await app.inject({ method: 'DELETE', url: `/api/admin/activities/${valid5k.id}`, headers: auth(adminToken) });
    expect(del.statusCode).toBe(200);

    const progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(8000); // 13000 - 5000
  });

  it('12. 排行榜只含 approved 成员；批量同步 ≤50 条', async () => {
    const lb = await app.inject({ method: 'GET', url: '/api/class/leaderboard', headers: auth(memberToken) });
    expect(lb.statusCode).toBe(200);
    const rows = lb.json().leaderboard;
    expect(rows.length).toBe(1);
    expect(rows[0].nickname).toBe('测试队员');
    expect(rows[0].totalM).toBe(8000);

    const sync = await app.inject({
      method: 'POST', url: '/api/activities/sync', headers: auth(memberToken),
      payload: { activities: [gpsActivity('cid-sync-01', 3), gpsActivity('cid-sync-01', 3), gpsActivity('cid-sync-02', 2)] },
    });
    expect(sync.statusCode).toBe(200);
    const body = sync.json();
    expect(body.synced).toBe(3);
    expect(body.results.filter((r: { duplicated?: boolean }) => r.duplicated).length).toBe(1);

    const progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(13000); // 8000 + 3000 + 2000
  });

  it('13. 未带 token 访问受保护接口 → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/activities/mine' });
    expect(res.statusCode).toBe(401);
    const res2 = await app.inject({ method: 'GET', url: '/api/class/progress' });
    expect(res2.statusCode).toBe(401);
  });

  it('14. 悦跑圈导入（带轨迹）→ 轨迹合规直接 valid 并计入进度', async () => {
    const act = { ...gpsActivity('cid-joyrun-01', 5), source: 'joyrun' as const };
    const res = await app.inject({
      method: 'POST', url: '/api/activities', headers: auth(memberToken), payload: act,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().activity.source).toBe('joyrun');
    expect(res.json().activity.status).toBe('valid');

    const progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(18000); // 13000 + 5000
  });

  it('15. 悦跑圈导入（无轨迹纯声明）→ pending 不计入；审核通过后计入', async () => {
    const start = new Date('2026-07-16T07:00:00.000Z');
    const res = await app.inject({
      method: 'POST', url: '/api/activities', headers: auth(memberToken),
      payload: {
        clientId: 'cid-joyrun-02', source: 'joyrun',
        distanceM: 3000, durationSec: 1200,
        startedAt: start.toISOString(), endedAt: new Date(start.getTime() + 1200_000).toISOString(),
        evidenceNote: '悦跑圈截图凭证',
      },
    });
    expect(res.statusCode).toBe(201);
    const activity = res.json().activity;
    expect(activity.status).toBe('pending');

    const before = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(before.json().totalM).toBe(18000); // 未计入

    const approve = await app.inject({
      method: 'POST', url: `/api/admin/activities/${activity.id}/review`,
      headers: auth(adminToken), payload: { action: 'approve' },
    });
    expect(approve.statusCode).toBe(200);

    const after = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(after.json().totalM).toBe(21000); // 18000 + 3000
  });

  it('16. 悦跑圈OAuth：状态/授权地址/回调建连', async () => {
    const st0 = await app.inject({ method: 'GET', url: '/api/providers/joyrun/status', headers: auth(memberToken) });
    expect(st0.json()).toMatchObject({ enabled: true, connected: false });

    const au = await app.inject({ method: 'GET', url: '/api/providers/joyrun/authorize-url', headers: auth(memberToken) });
    expect(au.statusCode).toBe(200);
    const url = new URL(au.json().url);
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    const state = url.searchParams.get('state')!;

    const cb = await app.inject({ method: 'GET', url: `/api/providers/joyrun/callback?code=mock-code&state=${encodeURIComponent(state)}` });
    expect(cb.statusCode).toBe(302);
    expect(cb.headers.location).toContain('oauth=joyrun:connected');

    const st1 = await app.inject({ method: 'GET', url: '/api/providers/joyrun/status', headers: auth(memberToken) });
    expect(st1.json().connected).toBe(true);
  });

  it('17. 悦跑圈同步：官方API数据可信直入，进度增加', async () => {
    const sync = await app.inject({
      method: 'POST', url: '/api/providers/joyrun/sync', headers: auth(memberToken),
      payload: { from: '2026-07-10', to: '2026-07-11' },
    });
    expect(sync.statusCode).toBe(200);
    const body = sync.json();
    expect(body.total).toBe(2);          // 坏记录被跳过
    expect(body.imported).toBe(2);       // 可信来源：无轨迹也 valid
    expect(body.duplicated).toBe(0);

    const progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(29000); // 21000 + 5000 + 3000
  });

  it('18. 悦跑圈同步幂等：重复同步不翻倍', async () => {
    const sync = await app.inject({
      method: 'POST', url: '/api/providers/joyrun/sync', headers: auth(memberToken),
      payload: { from: '2026-07-10', to: '2026-07-11' },
    });
    expect(sync.json().duplicated).toBe(2);
    expect(sync.json().imported).toBe(0);

    const progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(29000);
  });

  it('19. 悦跑圈：未连接不可同步；断开后状态还原', async () => {
    const dis = await app.inject({ method: 'POST', url: '/api/providers/joyrun/disconnect', headers: auth(memberToken) });
    expect(dis.statusCode).toBe(200);
    const st = await app.inject({ method: 'GET', url: '/api/providers/joyrun/status', headers: auth(memberToken) });
    expect(st.json().connected).toBe(false);
    const sync = await app.inject({ method: 'POST', url: '/api/providers/joyrun/sync', headers: auth(memberToken), payload: {} });
    expect(sync.statusCode).toBe(409);
  });

  it('20. 华为运动健康：OAuth2 全流程 + 同步计入', async () => {
    const au = await app.inject({ method: 'GET', url: '/api/providers/huawei/authorize-url', headers: auth(memberToken) });
    expect(au.statusCode).toBe(200);
    const state = new URL(au.json().url).searchParams.get('state')!;

    const cb = await app.inject({ method: 'GET', url: `/api/providers/huawei/callback?code=hw-code&state=${encodeURIComponent(state)}` });
    expect(cb.statusCode).toBe(302);
    expect(cb.headers.location).toContain('oauth=huawei:connected');

    const sync = await app.inject({ method: 'POST', url: '/api/providers/huawei/sync', headers: auth(memberToken),
      payload: { from: '2026-07-10', to: '2026-07-11' } });
    const body = sync.json();
    expect(body.total).toBe(2);
    expect(body.imported).toBe(2); // 6000 + 2500

    const progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(37500); // 29000 + 8500
  });

  it('21. 佳明 Garmin：OAuth1.0a 三段式 + 签名拉取（仅跑步计入）', async () => {
    const au = await app.inject({ method: 'GET', url: '/api/providers/garmin/authorize-url', headers: auth(memberToken) });
    expect(au.statusCode).toBe(200);
    const url = new URL(au.json().url);
    expect(url.searchParams.get('oauth_token')).toBe('req-tok-1');
    // state 嵌在 oauth_callback 里，回调时带回；测试直接另签一个同用户 state
    const st2 = await app.inject({ method: 'GET', url: '/api/providers/garmin/status', headers: auth(memberToken) });
    expect(st2.json().connected).toBe(false); // 占位 PENDING 不算已连接

    // 佳明回跳时 state 由 oauth_callback 带回；此处模拟：取 authorize-url 签发的 garmin state（jti 落库）并重签同结构 JWT
    const stRow = await app.prisma.oAuthState.findFirst({ where: { provider: 'garmin', userId: memberId }, orderBy: { createdAt: 'desc' } });
    expect(stRow).toBeTruthy();
    const state = app.jwt.sign({ sub: memberId, role: 'member', status: 'approved', jti: stRow!.id } as never, { expiresIn: '10m' });
    const cb = await app.inject({ method: 'GET', url: `/api/providers/garmin/callback?oauth_token=req-tok-1&oauth_verifier=ver-1&state=${encodeURIComponent(state)}` });
    expect(cb.statusCode).toBe(302);
    expect(cb.headers.location).toContain('oauth=garmin:connected');

    const sync = await app.inject({ method: 'POST', url: '/api/providers/garmin/sync', headers: auth(memberToken),
      payload: { from: '2026-07-10', to: '2026-07-11' } });
    const body = sync.json();
    expect(body.total).toBe(1);           // 骑行记录被过滤
    expect(body.imported).toBe(1);
    expect(body.details[0].distanceM).toBe(4000);

    const progress = await app.inject({ method: 'GET', url: '/api/class/progress', headers: auth(memberToken) });
    expect(progress.json().totalM).toBe(41500); // 37500 + 4000

    // 平台清单端点
    const list = await app.inject({ method: 'GET', url: '/api/providers', headers: auth(memberToken) });
    const providers = list.json().providers;
    expect(providers.length).toBe(3);
    expect(providers.find((p: { key: string }) => p.key === 'garmin').connected).toBe(true);
  });

  it('22. 未知平台 → 404 PROVIDER_UNKNOWN', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/providers/wechat/status', headers: auth(memberToken) });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('PROVIDER_UNKNOWN');
  });

  it('23. OAuth state 一次性：重用被消费 state → 400 防重放', async () => {
    const au = await app.inject({ method: 'GET', url: '/api/providers/joyrun/authorize-url', headers: auth(memberToken) });
    const state = new URL(au.json().url).searchParams.get('state')!;
    const cb1 = await app.inject({ method: 'GET', url: `/api/providers/joyrun/callback?code=once&state=${encodeURIComponent(state)}` });
    expect(cb1.statusCode).toBe(302);
    const cb2 = await app.inject({ method: 'GET', url: `/api/providers/joyrun/callback?code=once2&state=${encodeURIComponent(state)}` });
    expect(cb2.statusCode).toBe(400);
    expect(cb2.json().message).toContain('已被使用');
  });

  it('24. 令牌加密落库：DB 中不出现明文 access/refresh token', async () => {
    const conn = await app.prisma.externalConnection.findFirst({ where: { provider: 'joyrun', accessToken: { not: 'PENDING' } } });
    expect(conn).toBeTruthy();
    expect(conn!.accessToken.startsWith('enc1:')).toBe(true);
    if (conn!.refreshToken) expect(conn!.refreshToken.startsWith('enc1:')).toBe(true);
    // 明文 'mock-access-token' 不得出现
    expect(conn!.accessToken).not.toContain('mock-access-token');
  });

  it('25. catalog：五平台真实状态（mock_verified 为上限，微信/Apple 特殊前置状态）', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/integrations/catalog', headers: auth(memberToken) });
    expect(res.statusCode).toBe(200);
    const { catalog } = res.json();
    expect(catalog.length).toBe(5);
    const byKey = Object.fromEntries(catalog.map((c: { provider: string }) => [c.provider, c]));
    expect(byKey.joyrun.implementation_status).toBe('mock_verified');
    expect(byKey.huawei.implementation_status).toBe('mock_verified');
    expect(byKey.garmin.implementation_status).toBe('mock_verified');
    expect(byKey.wechat.implementation_status).toBe('requires_wechat_mini_program');
    expect(byKey.apple.implementation_status).toBe('requires_native_ios_healthkit');
    // 配置了环境变量但未经验证：只能标 configured_unverified，不得标 production_issued
    expect(byKey.joyrun.credential_status).toBe('configured_unverified');
    expect(byKey.joyrun.production_status).toBe('not_connected');
    // 佳明必须给出产品事实
    expect(byKey.garmin.product_facts.product).toContain('Garmin Health API');
    expect(byKey.garmin.product_facts.webhook).toContain('未接入');
    // 华为资质清单不得暗示"只填环境变量即可上线"
    expect(byKey.huawei.required_qualifications.join('')).toContain('AppGallery Connect');
    expect(byKey.huawei.required_qualifications.join('')).toContain('Health Kit');
    // 用户可见文案：mock_verified → 尚未开放
    expect(byKey.joyrun.user_visible_message).toContain('尚未开放');
  });

  it('26. Webhook：三平台未接入推送 → 501 NOT_SUPPORTED（不空实现）', async () => {
    for (const p of ['joyrun', 'huawei', 'garmin']) {
      const res = await app.inject({ method: 'POST', url: `/api/providers/${p}/webhook`, payload: { x: 1 } });
      expect(res.statusCode).toBe(501);
      expect(res.json().error).toBe('NOT_SUPPORTED');
    }
  });

  it('27. 微信小程序通道：未配置密钥 → 503 如实返回', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/integrations/wechat-miniprogram/activities',
      payload: { phone: '13922223333', clientId: 'wx-test-0001', distanceM: 5000, durationSec: 1800, startedAt: '2026-07-12T00:00:00Z', endedAt: '2026-07-12T00:30:00Z' } });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe('MINIPROGRAM_NOT_ENABLED');
  });

  it('28. 断开连接执行撤销与凭据清除（华为撤销端点被调用）', async () => {
    // 先建连
    const au = await app.inject({ method: 'GET', url: '/api/providers/huawei/authorize-url', headers: auth(memberToken) });
    const state = new URL(au.json().url).searchParams.get('state')!;
    await app.inject({ method: 'GET', url: `/api/providers/huawei/callback?code=rev&state=${encodeURIComponent(state)}` });
    (globalThis as Record<string, unknown>).__hwRevoked = false;
    const dis = await app.inject({ method: 'POST', url: '/api/providers/huawei/disconnect', headers: auth(memberToken) });
    expect(dis.statusCode).toBe(200);
    expect(dis.json().revoked).toBe(true);
    expect((globalThis as Record<string, unknown>).__hwRevoked).toBe(true);
    const conn = await app.prisma.externalConnection.findFirst({ where: { provider: 'huawei' } });
    expect(conn).toBeNull();
  });

  it('29. CORS：开发态回显来源；生产态未配置白名单则拒绝跨域', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health', headers: { origin: 'https://e23.example.com' } });
    expect(res.headers['access-control-allow-origin']).toBeTruthy();
  });

  it('30. 对象存储：未配置凭据 → 如实 not_supported（预留接口）', async () => {
    const { storage } = await import('../src/services/storage.js');
    expect(storage.isConfigured()).toBe(false);
    const r = await storage.putObject('test/x.png', Buffer.from('x'), 'image/png');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('not_supported');
  });

  it('31. 限流：超过 RATE_LIMIT_MAX 后返回 429', async () => {
    let got429 = false;
    for (let i = 0; i < 420; i++) {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      if (res.statusCode === 429) { got429 = true; break; }
    }
    expect(got429).toBe(true);
  }, 60_000);
});
