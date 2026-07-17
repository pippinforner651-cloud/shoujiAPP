const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.emulate({
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:8899/', { waitUntil: 'networkidle0', timeout: 30000 });
  const loadMs = Date.now() - t0;

  // 1. 测试登录：手机号 + 验证码 123456
  const inputs = await page.$$('input');
  await inputs[0].type('13800138000');
  await inputs[1].type('123456');
  const btns = await page.$$('button');
  for (const b of btns) { const t = await b.evaluate(el => el.textContent || ''); if (t.includes('进入活动')) { await b.click(); break; } }
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: '/tmp/m1_home.png' });

  // 2. 首页要素检查
  const home = await page.evaluate(() => document.body.innerText);
  const checks = {
    今日里程: home.includes('今日里程'), 今日打卡: home.includes('今日打卡次数'),
    年度目标: home.includes('年度目标'), 多人未上线: home.includes('多人功能尚未上线'),
    最近动态: home.includes('最近运动动态'), 剩余: home.includes('剩余'),
  };

  // 3. 点击位置卡 → 抽屉
  for (const b of await page.$$('button')) { const t = await b.evaluate(el => el.textContent || ''); if (t.includes('点击小人查看')) { await b.click(); break; } }
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: '/tmp/m2_pos.png' });

  // 4. 跑步页（手动补录入口存在）
  for (const b of await page.$$('button')) { const t = await b.evaluate(el => el.textContent || ''); if (t.includes('跑步')) { await b.click(); break; } }
  await new Promise(r => setTimeout(r, 500));
  const run = await page.evaluate(() => document.body.innerText);
  checks['手动补录'] = run.includes('手动补录');
  checks['GPS提示'] = run.includes('GPS') && run.includes('尚未实现');
  await page.screenshot({ path: '/tmp/m3_run.png' });

  // 5. 手动补录一次 5.2km / 30min
  for (const b of await page.$$('button')) { const t = await b.evaluate(el => el.textContent || ''); if (t.includes('手动补录')) { await b.click(); break; } }
  await new Promise(r => setTimeout(r, 400));
  const minputs = await page.$$('input');
  await minputs[1].type('5.2');
  await minputs[2].type('30');
  for (const b of await page.$$('button')) { const t = await b.evaluate(el => el.textContent || ''); if (t === '保存') { await b.click(); break; } }
  await new Promise(r => setTimeout(r, 600));
  // 返回看总结
  for (const b of await page.$$('button')) { const t = await b.evaluate(el => el.textContent || ''); if (t === '返回') { await b.click(); break; } }
  await new Promise(r => setTimeout(r, 400));

  // 6. 排行榜：未启用 + 本人卡片（含5.2km）
  for (const b of await page.$$('button')) { const t = await b.evaluate(el => el.textContent || ''); if (t.includes('排行榜')) { await b.click(); break; } }
  await new Promise(r => setTimeout(r, 500));
  const rank = await page.evaluate(() => document.body.innerText);
  checks['排行未启用'] = rank.includes('尚未启用');
  checks['本人卡片'] = rank.includes('5.2');
  await page.screenshot({ path: '/tmp/m4_rank.png' });

  // 7. 我的：运动次数/贡献比例/DRAFT
  for (const b of await page.$$('button')) { const t = await b.evaluate(el => el.textContent || ''); if (t.includes('我的')) { await b.click(); break; } }
  await new Promise(r => setTimeout(r, 500));
  const prof = await page.evaluate(() => document.body.innerText);
  checks['运动次数'] = prof.includes('运动次数');
  checks['贡献比例'] = prof.includes('环线贡献');
  checks['DRAFT'] = prof.includes('DRAFT');
  await page.screenshot({ path: '/tmp/m5_profile.png' });

  console.log(JSON.stringify({ loadMs, checks }));
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
