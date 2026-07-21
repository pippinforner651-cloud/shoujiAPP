// 测试数据库选择逻辑（唯一事实源）：
//   1) TEST_DATABASE_URL / DATABASE_URL 存在 → 使用外部 PostgreSQL（CI service 或本机 PG），不启动 embedded-postgres
//   2) E23_TEST_MODE=embedded           → 显式测试 embedded-postgres fallback
//   3) 无外部 URL 且非 Windows          → 开发 fallback：embedded-postgres
//   4) 无外部 URL 且 Windows            → 明确失败并给出可读提示（不再尝试中文 locale initdb 补丁）
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import EmbeddedPostgres from 'embedded-postgres';

export type TestMode = 'integration' | 'embedded' | 'ci';

export interface DbDecision {
  kind: 'external' | 'embedded' | 'fail';
  url?: string;
  via?: string;
  message?: string;
}

/** 纯函数：在任何平台上都可验证 Windows 分支行为 */
export function decideTestDatabase(
  env: Pick<NodeJS.ProcessEnv, 'TEST_DATABASE_URL' | 'DATABASE_URL' | 'E23_TEST_MODE'>,
  platform: NodeJS.Platform,
): DbDecision {
  const mode = (env.E23_TEST_MODE || 'integration') as TestMode;
  const external = env.TEST_DATABASE_URL || env.DATABASE_URL;
  const via = env.TEST_DATABASE_URL ? 'TEST_DATABASE_URL' : 'DATABASE_URL';

  // test:ci：只允许 CI 提供的 PostgreSQL service，绝不回退 embedded
  if (mode === 'ci') {
    if (!env.TEST_DATABASE_URL) {
      return {
        kind: 'fail',
        message:
          '[test-db] test:ci 要求设置 TEST_DATABASE_URL（CI PostgreSQL service）。' +
          '当前未设置：明确失败，未启动 embedded-postgres。',
      };
    }
    return { kind: 'external', url: env.TEST_DATABASE_URL, via: 'TEST_DATABASE_URL' };
  }

  // 外部数据库优先（integration 默认模式）
  if (external) return { kind: 'external', url: external, via };

  // Windows 无外部 URL（且非显式 embedded 模式）：可读失败，不做中文 locale initdb 补丁，不伪造通过
  if (mode !== 'embedded' && platform === 'win32') {
    return {
      kind: 'fail',
      message:
        '[test-db] 未检测到 TEST_DATABASE_URL / DATABASE_URL。\n' +
        'Windows 环境不再自动启动 embedded-postgres（中文区域 initdb 报 ' +
        '"invalid byte sequence for encoding UTF8"；LANG/LC_ALL/PGCLIENTENCODING/initdbFlags ' +
        '等 locale 补丁已废弃，不再追加）。\n' +
        '请二选一：\n' +
        '  1) 启动本机 PostgreSQL 后设置环境变量再运行 npm test，例如：\n' +
        '     set TEST_DATABASE_URL=postgresql://e23:e23ci@localhost:5432/e23\n' +
        '  2) 显式运行 npm run test:embedded 试用内置数据库（中文 Windows 上可能失败）。',
    };
  }

  // 非 Windows 开发机 fallback
  return { kind: 'embedded' };
}

export interface ResolvedTestDatabase {
  url: string;
  pg: EmbeddedPostgres | null;
  mode: 'external' | 'embedded';
}

export async function resolveTestDatabase(): Promise<ResolvedTestDatabase> {
  const decision = decideTestDatabase(process.env, process.platform);
  if (decision.kind === 'fail') throw new Error(decision.message);
  if (decision.kind === 'external') {
    console.log(`[test-db] 使用外部数据库（${decision.via}），不启动 embedded-postgres`);
    return { url: decision.url as string, pg: null, mode: 'external' };
  }
  const explicit = process.env.E23_TEST_MODE === 'embedded';
  console.log(
    `[test-db] ${explicit ? '显式 embedded 模式' : '开发 fallback（非 Windows 且无外部数据库 URL）'}：启动 embedded-postgres`,
  );
  const pg = new EmbeddedPostgres({
    databaseDir: join(tmpdir(), 'e23-pg-test'),
    user: 'e23',
    password: 'e23local',
    port: 55442,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('e23test');
  return { url: 'postgresql://e23:e23local@localhost:55442/e23test', pg, mode: 'embedded' };
}
