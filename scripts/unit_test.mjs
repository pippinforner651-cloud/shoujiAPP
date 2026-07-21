// E23跑起来 · 单元断言（Node 环境，CI 可跑，无浏览器依赖）
// 验证：路线数据完整性 / 业务铁律 / 配置默认值
import { readFileSync, existsSync } from 'node:fs';

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.error(`  ✗ ${name}`); }
}

// 1. 路线数据
const routeSrc = readFileSync(new URL('../src/data/route.ts', import.meta.url), 'utf8');
const nodesJson = routeSrc.match(/nodes: (\[[\s\S]*?\n\])/);
const nodes = JSON.parse(nodesJson[1]);
const totalKm = nodes.reduce((s, n) => s + n.segKm, 0);
console.log('路线数据：');
ok('节点数 ≥ 100', nodes.length >= 100);
ok(`总里程 ≥ 27000（实际 ${totalKm}）`, totalKm >= 27000);
ok('起点为北大汇丰商学院', nodes[0].name.includes('北大汇丰'));
ok('终点闭环北大汇丰', nodes[nodes.length - 1].name.includes('北大汇丰'));
ok('每站含道路信息', nodes.filter(n => n.name).every(n => n.road && n.road.length > 0));
ok('命名站均含景点与美食', nodes.filter(n => n.name).every(n => n.spots.length > 0 && n.foods.length > 0));
ok('累计里程单调递增', nodes.every((n, i) => i === 0 || n.cumKm >= nodes[i - 1].cumKm));
ok('坐标在中国范围', nodes.every(n => n.lon >= 73 && n.lon <= 136 && n.lat >= 17 && n.lat <= 54));

// 2. 业务铁律（源码层面）
console.log('业务铁律：');
const storeSrc = readFileSync(new URL('../src/lib/store.ts', import.meta.url), 'utf8');
ok('无假同学/假跑者数据（CLASSMATES 已移除）', !storeSrc.includes('CLASSMATES'));
ok('无 1:10 虚拟放大', !routeSrc.includes('SCALE') && !storeSrc.includes('SCALE_RATIO'));
const configSrc = readFileSync(new URL('../src/config.ts', import.meta.url), 'utf8');
ok('多人默认关闭', configSrc.includes("MULTIPLAYER_ENABLED: import.meta.env.VITE_MULTIPLAYER_ENABLED === 'true'"));
ok('路线默认 DRAFT', configSrc.includes("ROUTE_STATUS: 'DRAFT'"));
ok('年度目标 270km', configSrc.includes('270'));

// 3. 登录明示
const loginSrc = readFileSync(new URL('../src/pages/LoginPage.tsx', import.meta.url), 'utf8');
ok('测试登录明确标注非真实短信/微信', loginSrc.includes('非真实短信') && loginSrc.includes('非微信授权'));

// 4. PWA 文件
console.log('PWA：');
const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
ok('manifest standalone', manifest.display === 'standalone');
ok('manifest 含 512 图标', manifest.icons.some(i => i.sizes === '512x512'));
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
ok('apple-touch-icon', indexHtml.includes('apple-touch-icon'));
ok('viewport-fit=cover', indexHtml.includes('viewport-fit=cover'));
ok('apple-mobile-web-app-capable', indexHtml.includes('apple-mobile-web-app-capable'));

// 5. Android 工程（静态检查）
console.log('Android 工程：');
const gradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
ok('appId 为 Kimi 预览版', gradle.includes('com.e23running.app.kimi.preview'));
ok('不含正式包名 com.e23running.app"', !gradle.includes('applicationId "com.e23running.app"'));
const am = readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
ok('含定位权限', am.includes('ACCESS_FINE_LOCATION'));
ok('含网络权限', am.includes('INTERNET'));

// 6. 无密钥泄漏
console.log('安全：');
const all = [routeSrc, storeSrc, configSrc, loginSrc].join('\n');
ok('无硬编码 Token/Secret', !/(appsecret|access_token|api[_-]?key\s*[:=]\s*['"][A-Za-z0-9]{16,})/i.test(all));

// 7. 第三阶段：后端与API层
console.log('第三阶段（后端/API层/适配器）：');
const be = (f) => readFileSync(new URL('../backend/' + f, import.meta.url), 'utf8');
const schema = be('prisma/schema.prisma');
ok('后端8表模型', ['model User', 'model InviteCode', 'model Activity', 'model ActivityTrackPoint', 'model ManualActivityEvidence', 'model RouteVersion', 'model RouteProgress', 'model AuditLog'].every(m => schema.includes(m)));
ok('幂等唯一约束', schema.includes('@@unique([userId, clientId])'));
const validSrc = be('src/services/validation.ts');
ok('校验引擎三态', validSrc.includes("'valid'") && validSrc.includes("'pending'") && validSrc.includes("'rejected'"));
ok('手动补录强制审核', validSrc.includes('手动补录待人工审核'));
const progSrc = be('src/services/progress.ts');
ok('汇总仅统计valid+approved', progSrc.includes("status: 'valid'") && progSrc.includes("status: 'approved'"));
const actRoute = be('src/routes/activities.ts');
ok('批量同步上限50', actRoute.includes('MAX_SYNC_BATCH'));
const apiClient = readFileSync(new URL('../src/api/client.ts', import.meta.url), 'utf8');
ok('API地址仅环境变量', apiClient.includes('VITE_API_BASE_URL') && !/https?:\/\/[a-z0-9.-]+\.(com|cn|net)/i.test(apiClient));
const syncSrc = readFileSync(new URL('../src/api/sync.ts', import.meta.url), 'utf8');
ok('离线队列去重', syncSrc.includes('clientId === payload.clientId'));
const providers = readFileSync(new URL('../src/providers/index.ts', import.meta.url), 'utf8');
ok('手表仍预留reserved', providers.includes("status: 'reserved'") && providers.includes("key: 'watch'"));

// 8. 第四阶段：悦跑圈接入
console.log('第四阶段（悦跑圈接入）：');
const gpxSrc = readFileSync(new URL('../src/lib/gpx.ts', import.meta.url), 'utf8');
ok('GPX/TCX解析器', gpxSrc.includes('parseTrackFile') && gpxSrc.includes('parseGpx') && gpxSrc.includes('parseTcx'));
ok('解析器含抽稀上限', gpxSrc.includes('TRACK_UPLOAD_LIMIT') && gpxSrc.includes('downsample'));
ok('解析器不依赖DOM', !gpxSrc.includes('DOMParser') && !gpxSrc.includes('document.'));
const jrSrc = readFileSync(new URL('../src/components/JoyrunImport.tsx', import.meta.url), 'utf8');
ok('导入组件双通道', jrSrc.includes('轨迹文件导入') && jrSrc.includes('凭证补录'));
ok('导入来源为joyrun', (jrSrc.match(/source: 'joyrun'/g) || []).length >= 2);
ok('组件无伪造数据', !/Math\.random\(\)\s*\*\s*\d+\s*\*\s*1000/.test(jrSrc));
ok('joyrun适配器就绪', providers.includes("key: 'joyrun'") && /joyrunProvider[\s\S]*status: 'ready'/.test(providers));
const integSrc = readFileSync(new URL('../src/lib/integrations.ts', import.meta.url), 'utf8');
ok('悦跑圈条目标记可导入', /key: 'joyrun'[\s\S]*connected: true/.test(integSrc));
ok('服务端joyrun无轨迹强制审核', validSrc.includes('记录缺少轨迹数据'));
const storeSrc2 = readFileSync(new URL('../src/lib/store.ts', import.meta.url), 'utf8');
ok('本地记录支持joyrun来源', storeSrc2.includes("'joyrun'"));

// 9. 第五阶段（修正版）：多平台适配器契约 + 真实状态 + 安全要求
console.log('第五阶段（适配器契约/真实状态/安全）：');
const provSvc = be('src/services/providers.ts');
const CONTRACT = ['getAuthorizationUrl', 'exchangeAuthorization', 'refreshAuthorization', 'revokeAuthorization', 'pullActivities', 'normalizeActivity', 'getSyncCursor', 'saveSyncCursor', 'handleWebhook', 'verifyWebhookSignature', 'mapProviderError'];
ok('统一适配器契约11方法+enabled', CONTRACT.every(m => provSvc.includes(m)) && provSvc.includes('enabled()'));
ok('不支持的方法显式not_supported', (provSvc.match(/notSupported\(/g) || []).length >= 8 && provSvc.includes("'not_supported'"));
ok('三平台归一化映射', (provSvc.match(/normalizeActivity\(raw\)/g) || []).length >= 3);
ok('佳明仅跑步计入', provSvc.includes("!type.includes('run')"));
const cryptoSrc = be('src/services/crypto.ts');
ok('令牌AES-256-GCM加密', cryptoSrc.includes('aes-256-gcm') && cryptoSrc.includes('encryptSecret') && cryptoSrc.includes('decryptSecret'));
ok('生产环境缺密钥拒绝回退', cryptoSrc.includes('TOKEN_ENCRYPTION_KEY 未配置'));
const provRoute = be('src/routes/providers.ts');
ok('令牌加密落库', (provRoute.match(/encryptSecret/g) || []).length >= 3 && provRoute.includes('decryptSecret'));
ok('OAuth state一次性防重放', provRoute.includes('oAuthState') && provRoute.includes('已被使用（防重放）') && provRoute.includes('usedAt'));
ok('回调地址白名单', provRoute.includes('CALLBACK_ALLOWED_HOSTS') && provRoute.includes('assertCallbackAllowed'));
ok('断开执行撤销+凭据清除', provRoute.includes('revokeAuthorization') && provRoute.includes('deleteMany({ where: { userId: req.user.sub, provider } })') && provRoute.includes('oAuthState.deleteMany'));
ok('审计脱敏openId', provRoute.includes('maskId(t.openId)'));
ok('webhook不支持则501', provRoute.includes('verifyWebhookSignature') && provRoute.includes('NOT_SUPPORTED'));
ok('日志不打印令牌', !/log\.(info|warn|error)\([^)]*accessToken/i.test(provRoute));
const integRoute = be('src/routes/integrations.ts');
ok('catalog接口存在', integRoute.includes("/v1/integrations/catalog"));
ok('8级状态+特殊状态定义', ['adapter_not_started', 'adapter_implemented', 'mock_verified', 'sandbox_connected', 'production_credentials_ready', 'production_connected', 'pilot_verified', 'generally_available', 'requires_wechat_mini_program', 'requires_native_ios_healthkit'].every(x => integRoute.includes(x)));
ok('catalog字段齐全', ['display_name', 'connection_type', 'implementation_status', 'credential_status', 'sandbox_status', 'production_status', 'supported_activity_types', 'required_qualifications', 'privacy_requirements', 'commercial_risk', 'user_visible_message'].every(x => integRoute.includes(x)));
ok('佳明产品事实必填', integRoute.includes('Garmin Health API') && integRoute.includes('OAuth 1.0a') && integRoute.includes('wellness-api/rest/activities') && integRoute.includes('商业授权'));
ok('华为资质不含一键上线', integRoute.includes('AppGallery Connect') && integRoute.includes('Health Kit') && !integRoute.includes('只填环境变量'));
ok('微信小程序预留接口', integRoute.includes('wechat-miniprogram/activities') && integRoute.includes('MINIPROGRAM_NOT_ENABLED'));
ok('schema状态与票据表', schema.includes('model OAuthState') && schema.includes('model IntegrationState'));
ok('管理员状态推进端点', be('src/routes/admin.ts').includes('/integrations/:provider/mark'));
const panelSrc = readFileSync(new URL('../src/components/ProviderSyncPanel.tsx', import.meta.url), 'utf8');
ok('前端按钮状态驱动', panelSrc.includes('尚未开放') && panelSrc.includes('测试连接') && panelSrc.includes('授权连接') && panelSrc.includes('actionOf'));
ok('前端读catalog', readFileSync(new URL('../src/api/sync.ts', import.meta.url), 'utf8').includes('/api/v1/integrations/catalog'));
ok('微信Apple如实标注', integSrc.includes('微信小程序') && integSrc.includes('HealthKit'));
const backendCi = readFileSync(new URL('../.github/workflows/kimi-backend-ci.yml', import.meta.url), 'utf8');
ok('后端CI含真实PG测试', backendCi.includes('npm run test:ci') && backendCi.includes('npm ci') && backendCi.includes('postgres'));
const beAll = schema + validSrc + progSrc + actRoute + be('src/routes/auth.ts') + be('src/routes/admin.ts') + be('src/routes/class.ts');
ok('后端无硬编码密钥', !/(appsecret|password\s*[:=]\s*['"][^'"]{6,}['"]|api[_-]?key\s*[:=]\s*['"][A-Za-z0-9]{16,})/i.test(beAll.replace(/passwordHash/g, '')));

// 10. 第六阶段：真实云端部署加固 + 悦跑圈联调准备
console.log('第六阶段（云端加固/联调准备）：');
const appSrc = be('src/app.ts');
ok('全局限流', appSrc.includes('@fastify/rate-limit') && appSrc.includes('RATE_LIMIT_MAX'));
ok('生产CORS禁止裸奔', appSrc.includes("process.env.NODE_ENV === 'production' ? false : true") && appSrc.includes('CORS_ORIGIN.split'));
const storageSrc = be('src/services/storage.ts');
ok('对象存储预留not_supported', storageSrc.includes('not_supported') && storageSrc.includes('STORAGE_ENDPOINT'));
const composeSrc = readFileSync(new URL('../backend/docker-compose.yml', import.meta.url), 'utf8');
ok('compose含HTTPS档案', composeSrc.includes('caddy') && composeSrc.includes('profiles: ["https"]'));
ok('compose强制密钥', composeSrc.includes('TOKEN_ENCRYPTION_KEY:?') && composeSrc.includes('CORS_ORIGIN:?'));
ok('compose不含生产密码', !composeSrc.includes('POSTGRES_PASSWORD: e23'));
const deploySh = readFileSync(new URL('../deploy/deploy.sh', import.meta.url), 'utf8');
ok('部署脚本含迁移与健康检查', deploySh.includes('prisma migrate deploy') && deploySh.includes('/api/health'));
ok('备份脚本存在', readFileSync(new URL('../deploy/pg_backup.sh', import.meta.url), 'utf8').includes('pg_dump'));
ok('Caddyfile自动证书', readFileSync(new URL('../deploy/Caddyfile', import.meta.url), 'utf8').includes('reverse_proxy'));
ok('环境变量清单', readFileSync(new URL('../deploy/环境变量清单.md', import.meta.url), 'utf8').includes('TOKEN_ENCRYPTION_KEY'));
ok('资源清单不声称已上线', readFileSync(new URL('../deploy/云端资源清单.md', import.meta.url), 'utf8').includes('后端尚未上线'));
const jrRunbook = readFileSync(new URL('../docs/悦跑圈真实联调清单.md', import.meta.url), 'utf8');
ok('悦跑圈16步验收表', jrRunbook.includes('Token 加密落库') && jrRunbook.includes('不重复累计') && jrRunbook.includes('mock_verified'));
ok('状态升级只能管理员留痕推进', be('src/routes/admin.ts').includes('/integrations/:provider/mark'));

// 11. 第七阶段：真实仓库接入准备
console.log('第七阶段（仓库接入准备）：');
const ps1 = readFileSync(new URL('integrate-kimi-backend.ps1', import.meta.url), 'utf8');
ok('接入脚本16步齐全', Array.from({ length: 16 }, (_, i) => i + 1).every(n => ps1.includes('== ' + n + '/16')));
ok('脚本保护条款', ps1.includes('不修改 main') || ps1.includes('不修改main') || ps1.includes('main、不 force push'));
ok('脚本不覆盖android与根lock', !ps1.includes("robocopy $pkgBackend 'android'") && ps1.includes('android/ 不在本脚本写入范围'));
ok('脚本测过才提交', ps1.indexOf('npm test') < ps1.indexOf('git commit'));
ok('脚本校验SHA一致', ps1.includes('remoteSha') && ps1.includes('headSha'));
const ciYml = readFileSync(new URL('../.github/workflows/kimi-backend-ci.yml', import.meta.url), 'utf8');
ok('后端CI名称', ciYml.includes('name: Kimi Backend CI'));
ok('后端CI含PGservice', ciYml.includes('postgres:16-alpine') && ciYml.includes('services:'));
ok('后端CI全步骤', ['npm ci', 'npm run typecheck', 'npm run lint', 'prisma migrate deploy', 'npm run test:ci', 'npm run build', 'docker build'].every(x => ciYml.includes(x)));
ok('后端CI不用生产库', ciYml.includes('e23ci') && !ciYml.includes('生产数据库密码'));
const bePkg = JSON.parse(readFileSync(new URL('../backend/package.json', import.meta.url), 'utf8'));
ok('后端typecheck/lint脚本', bePkg.scripts.typecheck === 'tsc --noEmit' && bePkg.scripts.lint === 'eslint .');
ok('lock无失效镜像', !readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8').includes('msh.team') && !readFileSync(new URL('../backend/package-lock.json', import.meta.url), 'utf8').includes('msh.team'));
ok('eslint配置存在', existsSync(new URL('../backend/eslint.config.mjs', import.meta.url)));
ok('风险清单存在', existsSync(new URL('../docs/风险清单.md', import.meta.url)));
ok('文件清单存在', existsSync(new URL('../docs/文件清单.md', import.meta.url)));

// 12. 第八阶段：测试数据库架构（外部PG优先，embedded仅fallback）
console.log('第八阶段（测试数据库架构）：');
const dbSetup = be('tests/db-setup.ts');
const apiTestFull = be('tests/api.test.ts');
ok('测试库外部URL优先', dbSetup.includes('env.TEST_DATABASE_URL || env.DATABASE_URL') && dbSetup.indexOf('env.TEST_DATABASE_URL || env.DATABASE_URL') < dbSetup.indexOf('new EmbeddedPostgres'));
ok('Windows无URL可读失败', dbSetup.includes("platform === 'win32'") && dbSetup.includes('npm run test:embedded') && dbSetup.includes('未检测到 TEST_DATABASE_URL / DATABASE_URL'));
ok('无locale补丁残留', !/(process\.env\.(LANG|LC_ALL|PGCLIENTENCODING)\s*=|initdbFlags\s*:)/.test(dbSetup + apiTestFull));
ok('测试不无条件建embedded', !apiTestFull.includes('new EmbeddedPostgres') && apiTestFull.includes('resolveTestDatabase') && apiTestFull.includes('if (pg)'));
ok('测试命令三分', ['test:integration', 'test:embedded', 'test:ci'].every(k => bePkg.scripts[k] && bePkg.scripts[k].includes('vitest-run.mjs')));
ok('CI用TEST_DATABASE_URL且步骤名准确', ciYml.includes('TEST_DATABASE_URL: postgresql://e23:e23ci@localhost:5432/e23') && ciYml.includes('npm run test:ci') && !ciYml.includes('embedded-postgres PG17'));
ok('force-reset保证重复运行确定', apiTestFull.includes('db push --force-reset'));

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
