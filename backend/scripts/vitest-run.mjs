// 以指定模式运行 vitest（跨平台零依赖，替代 cross-env）
// 用法：node scripts/vitest-run.mjs <integration|embedded|ci>
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2];
if (!['integration', 'embedded', 'ci'].includes(mode)) {
  console.error('[vitest-run] 用法: node scripts/vitest-run.mjs <integration|embedded|ci>');
  process.exit(2);
}

const env = { ...process.env, E23_TEST_MODE: mode };
const vitestEntry = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url));
const r = spawnSync(process.execPath, [vitestEntry, 'run'], { stdio: 'inherit', env });
process.exit(r.status ?? 1);
