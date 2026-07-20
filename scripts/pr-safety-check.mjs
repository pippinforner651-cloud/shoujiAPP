import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [baseRef, headRef = 'HEAD'] = process.argv.slice(2);

if (!baseRef) {
  console.error('Usage: node scripts/pr-safety-check.mjs <base-ref> [head-ref]');
  process.exit(2);
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const lines = (value) => value.split(/\r?\n/).filter(Boolean);
const failures = [];

const changedFiles = lines(git('diff', '--name-only', `${baseRef}...${headRef}`));
const addedFiles = lines(git('diff', '--diff-filter=A', '--name-only', `${baseRef}...${headRef}`));

const frozenV1Files = new Set([
  'data/route_master_v1.json',
  'data/route_master/changelog.md',
  'frontend/src/data/routeLoader.ts',
  'frontend/src/types/progress.ts',
  'frontend/src/utils/routeProgress.ts',
  'frontend/src/utils/routeProgressCore.ts',
]);

for (const file of changedFiles) {
  if (frozenV1Files.has(file)) {
    failures.push(`V1冻结路线或1:10逻辑被修改：${file}`);
  }
}

for (const file of addedFiles) {
  if (/^backend\/prisma\/migrations\/.+\/migration\.sql$/i.test(file)) {
    failures.push(`PR新增了未批准的标准Prisma迁移：${file}`);
  }
}

const sensitiveFilePattern = /(^|\/)(\.env(?:\..+)?|local\.properties|[^/]+\.(?:jks|keystore|p12|pfx|pem|key))$/i;
for (const file of changedFiles) {
  if (sensitiveFilePattern.test(file)) {
    failures.push(`PR包含敏感或本机配置文件：${file}`);
  }
}

const addedDiff = git('diff', '--unified=0', '--no-color', `${baseRef}...${headRef}`)
  .split(/\r?\n/)
  .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
  .join('\n');
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /ghp_[A-Za-z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /(?:client_secret|api_secret|access_token)\s*[:=]\s*["'][A-Za-z0-9_\-./+=]{12,}["']/i,
];
if (secretPatterns.some((pattern) => pattern.test(addedDiff))) {
  failures.push('PR新增内容疑似包含密钥、Token或私钥。');
}

const routeDraft = JSON.parse(readFileSync('data/route_packages/e23-china-loop-v2.draft.json', 'utf8'));
if (routeDraft.status !== 'DRAFT') {
  failures.push(`V2未核验路线状态必须为DRAFT，当前为：${routeDraft.status}`);
}
if (routeDraft.provenance?.auditedAt !== null) {
  failures.push('V2草案不得伪造已审计时间。');
}
if (!String(routeDraft.auditNote ?? '').includes('不能绑定正式活动')) {
  failures.push('V2草案必须明确标注不可绑定正式活动。');
}

const productionTruthChecks = [
  ['backend/src/routes/auth.ts', /mockWechatUser|mock[_-]?token|wx_openid_/i],
  ['backend/src/routes/phoneAuth.ts', /fixedCode|mock[_-]?token|test[_-]?token/i],
  ['frontend/src/store/globalProgressStore.ts', /generateMock|mockGlobalRunners|fallbackToMock/i],
];
for (const [file, pattern] of productionTruthChecks) {
  const content = readFileSync(file, 'utf8');
  if (pattern.test(content)) failures.push(`生产路径重新引入模拟身份、令牌或排行回退：${file}`);
}

if (failures.length > 0) {
  console.error('PR安全门禁失败：');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PR安全门禁通过：检查了 ${changedFiles.length} 个变更文件。`);
