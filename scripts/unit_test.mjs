// E23跑起来 · 单元断言（Node 环境，CI 可跑，无浏览器依赖）
// 验证：路线数据完整性 / 业务铁律 / 配置默认值
import { readFileSync } from 'node:fs';

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

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
