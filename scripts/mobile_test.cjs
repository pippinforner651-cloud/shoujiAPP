// E23跑起来 · 移动端等效环境回归测试（Chromium + iPhone UA + 触屏）
// 用法：node scripts/mobile_test.cjs [宽度1,宽度2,...]  默认 375,390,393,430
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.ico': 'image/x-icon' };

function serve(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent((req.url || '/').split('?')[0]);
      if (p === '/') p = '/index.html';
      let f = path.join(root, p);
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
      res.setHeader('Content-Type', mime[path.extname(f)] || 'application/octet-stream');
      fs.createReadStream(f).pipe(res);
    });
    server.listen(port, () => resolve(server));
  });
}

async function runWidth(browser, width) {
  const page = await browser.newPage();
  await page.emulate({
    viewport: { width, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:8898/', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => localStorage.clear()); // 每个宽度独立开局
  await page.reload({ waitUntil: 'networkidle0' });
  const loadMs = Date.now() - t0;

  // 1. 测试登录：手机号 + 验证码 123456
  const inputs = await page.$$('input');
  await inputs[0].type('13800138000');
  await inputs[1].type('123456');
  for (const b of await page.$$('button')) { const t = await b.evaluate((el) => el.textContent || ''); if (t.includes('进入活动')) { await b.click(); break; } }
  await new Promise((r) => setTimeout(r, 1200));

  // 2. 首页要素
  const home = await page.evaluate(() => document.body.innerText);
  const checks = {
    今日里程: home.includes('今日里程'), 今日打卡: home.includes('今日打卡次数'),
    年度目标: home.includes('年度目标'), 多人未上线: home.includes('多人功能尚未上线'),
    最近动态: home.includes('最近运动动态'), 剩余: home.includes('剩余'),
    双图切换: home.includes('班级接力图') && home.includes('我的足迹图'),
  };

  // 3. 位置卡 → 抽屉
  for (const b of await page.$$('button')) { const t = await b.evaluate((el) => el.textContent || ''); if (t.includes('点击小人查看')) { await b.click(); break; } }
  await new Promise((r) => setTimeout(r, 700));
  const drawer = await page.evaluate(() => document.body.innerText);
  checks['位置抽屉'] = drawer.includes('当前所在道路') && drawer.includes('距下一城市');
  for (const b of await page.$$('button')) { const t = await b.evaluate((el) => el.textContent || ''); if (t === '✕') { await b.click(); break; } }
  await new Promise((r) => setTimeout(r, 300));

  // 4. 跑步页
  for (const b of await page.$$('button')) { const t = await b.evaluate((el) => el.textContent || ''); if (t.includes('跑步')) { await b.click(); break; } }
  await new Promise((r) => setTimeout(r, 500));
  const run = await page.evaluate(() => document.body.innerText);
  checks['手动补录'] = run.includes('手动补录');
  checks['GPS提示'] = run.includes('GPS') && run.includes('尚未实现');

  // 5. 手动补录 5.2km / 30min
  for (const b of await page.$$('button')) { const t = await b.evaluate((el) => el.textContent || ''); if (t.includes('手动补录一次跑步')) { await b.click(); break; } }
  await new Promise((r) => setTimeout(r, 400));
  const minputs = await page.$$('input');
  await minputs[1].type('5.2');
  await minputs[2].type('30');
  for (const b of await page.$$('button')) { const t = await b.evaluate((el) => el.textContent || ''); if (t === '保存') { await b.click(); break; } }
  await new Promise((r) => setTimeout(r, 700));
  const done = await page.evaluate(() => document.body.innerText);
  checks['完成页同步提示'] = done.includes('本机模式') || done.includes('已上传') || done.includes('待同步');
  for (const b of await page.$$('button')) { const t = await b.evaluate((el) => el.textContent || ''); if (t === '返回') { await b.click(); break; } }
  await new Promise((r) => setTimeout(r, 400));

  // 6. 排行榜
  for (const b of await page.$$('button')) { const t = await b.evaluate((el) => el.textContent || ''); if (t.includes('排行榜')) { await b.click(); break; } }
  await new Promise((r) => setTimeout(r, 500));
  const rank = await page.evaluate(() => document.body.innerText);
  checks['排行未启用'] = rank.includes('尚未启用');
  checks['本人卡片'] = rank.includes('5.2');

  // 7. 我的
  for (const b of await page.$$('button')) { const t = await b.evaluate((el) => el.textContent || ''); if (t.includes('我的')) { await b.click(); break; } }
  await new Promise((r) => setTimeout(r, 500));
  const prof = await page.evaluate(() => document.body.innerText);
  checks['运动次数'] = prof.includes('运动次数');
  checks['贡献比例'] = prof.includes('环线贡献');
  checks['DRAFT'] = prof.includes('DRAFT');

  // 7.1 悦跑圈导入入口（第四阶段）
  checks['悦跑圈可导入徽标'] = prof.includes('悦跑圈') && prof.includes('可导入');
  for (const b of await page.$$('button')) { const t = await b.evaluate((el) => el.textContent || ''); if (t.includes('悦跑圈')) { await b.click(); break; } }
  await new Promise((r) => setTimeout(r, 400));
  const jr = await page.evaluate(() => document.body.innerText);
  checks['悦跑圈双通道面板'] = jr.includes('轨迹文件导入') && jr.includes('凭证补录');
  checks['GPX选择按钮'] = jr.includes('选择 GPX / TCX 文件');
  // 第五阶段：官方授权自动同步入口（本机模式如实显示不可用）
  checks['官方授权自动同步区块'] = jr.includes('官方授权自动同步');
  checks['本机模式如实提示'] = jr.includes('本机模式不可用');

  // 佳明/华为也可授权接入；微信/Apple 如实标注不可直连
  checks['佳明华为尚未开放徽标'] = (prof.match(/尚未开放/g) || []).length >= 2;
  checks['微信Apple暂不可直连'] = (prof.match(/暂不可直连/g) || []).length >= 2;
  for (const b of await page.$$('button')) { const t = await b.evaluate((el) => el.textContent || ''); if (t.includes('华为运动健康')) { await b.click(); break; } }
  await new Promise((r) => setTimeout(r, 400));
  const hw = await page.evaluate(() => document.body.innerText);
  checks['华为面板本机提示'] = hw.includes('本机模式不可用');

  await page.close();
  return { width, loadMs, checks };
}

(async () => {
  const widths = (process.argv[2] || '375,390,393,430').split(',').map(Number);
  const server = await serve(8898);
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-gpu'] });
  const results = [];
  for (const w of widths) results.push(await runWidth(browser, w));
  await browser.close();
  server.close();

  let fail = 0;
  for (const r of results) {
    const bad = Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k);
    if (bad.length) fail++;
    console.log(`[${r.width}px] 加载 ${r.loadMs}ms · ${bad.length ? '失败: ' + bad.join(',') : '全部通过 ' + Object.keys(r.checks).length + ' 项'}`);
  }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
