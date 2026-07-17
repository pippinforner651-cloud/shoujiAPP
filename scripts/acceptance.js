const puppeteer = require('puppeteer-core');
const R = [];
const ok = (name, pass, note = '') => { R.push({ name, pass: !!pass, note }); };

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.emulate({
    viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const text = () => page.evaluate(() => document.body.innerText);
  const clickBtn = async (match) => {
    for (const b of await page.$$('button')) {
      const t = await b.evaluate(el => el.textContent || '');
      if (t.includes(match)) { await b.click(); return true; }
    }
    return false;
  };

  await page.goto('http://127.0.0.1:8899/', { waitUntil: 'networkidle0', timeout: 30000 });

  // ① 登录页
  let t = await text();
  ok('①登录页标注测试性质', t.includes('非真实短信') && t.includes('非微信授权'));
  const inputs = await page.$$('input');
  await inputs[0].type('13800138000');
  await inputs[1].type('999999');
  await clickBtn('进入活动');
  await new Promise(r => setTimeout(r, 400));
  ok('①错误验证码被拒绝', (await text()).includes('测试验证码为'));
  await inputs[1].click({ clickCount: 3 });
  await inputs[1].type('123456');
  await clickBtn('进入活动');
  await new Promise(r => setTimeout(r, 900));
  t = await text();
  ok('①正确验证码进入', t.includes('E23班环中国接力'));

  // ② 首页
  ok('②顶部统计齐全', t.includes('今日里程') && t.includes('今日打卡次数') && t.includes('27,171') && t.includes('年度目标'));
  ok('②多人未上线横幅', t.includes('多人功能尚未上线'));
  ok('②最近动态空态', t.includes('还没有运动记录'));
  ok('②起点标注', t.includes('北大汇丰·起点'));
  const svgBox1 = await page.evaluate(() => document.querySelector('svg')?.getAttribute('viewBox'));
  // 滚轮缩放
  await page.mouse.move(195, 450);
  await page.mouse.wheel({ deltaY: -300 });
  await new Promise(r => setTimeout(r, 300));
  const svgBox2 = await page.evaluate(() => document.querySelector('svg')?.getAttribute('viewBox'));
  ok('②缩放生效', svgBox1 !== svgBox2);
  // 单指拖动
  const before = svgBox2.split(' ').slice(0, 2).map(Number);
  await page.mouse.move(195, 450); await page.mouse.down();
  await page.mouse.move(150, 420, { steps: 5 }); await page.mouse.up();
  await new Promise(r => setTimeout(r, 300));
  const after = (await page.evaluate(() => document.querySelector('svg')?.getAttribute('viewBox'))).split(' ').slice(0, 2).map(Number);
  ok('②拖动生效', Math.abs(after[0] - before[0]) + Math.abs(after[1] - before[1]) > 0.5);
  // 两指捏合（CDP 双触点）
  const cdp = await page.createCDPSession();
  const vb0 = await page.evaluate(() => document.querySelector('svg')?.getAttribute('viewBox'));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: 450, id: 1 }, { x: 250, y: 450, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 90, y: 450, id: 1 }, { x: 310, y: 450, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await new Promise(r => setTimeout(r, 400));
  const vb1 = await page.evaluate(() => document.querySelector('svg')?.getAttribute('viewBox'));
  ok('②两指捏合缩放', vb0 !== vb1, `${vb0?.slice(0, 30)} → ${vb1?.slice(0, 30)}`);
  // 复位
  await clickBtn('全局');

  // ③ 小人 + 站点
  const runner = await page.$('[data-testid="runner"]');
  ok('③小人存在', !!runner);
  const rb = await page.evaluate(() => { const r = document.querySelector('[data-testid="runner"]').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  ok('③小人尺寸放大', rb && rb.w >= 24, rb ? `${Math.round(rb.w)}px` : '无');
  await page.mouse.click(rb.x + rb.w / 2, rb.y + rb.w / 2);
  await new Promise(r => setTimeout(r, 600));
  t = await text();
  ok('③小人点击弹层三要素', t.includes('当前所在道路') && t.includes('正在前往') && t.includes('距下一城市'));
  await page.screenshot({ path: '/tmp/a_runner.png' });
  await clickBtn('✕');
  // 点击喀什
  const kashgar = await page.$('circle[data-node="喀什"]');
  if (kashgar) {
    const kb = await page.evaluate(() => { const r = document.querySelector('circle[data-node="喀什"]').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
    await page.mouse.click(kb.x + kb.w / 2, kb.y + kb.w / 2);
    await new Promise(r => setTimeout(r, 600));
    t = await text();
    ok('③点击喀什出详情', t.includes('喀什古城') && t.includes('烤全羊'));
    await page.screenshot({ path: '/tmp/a_kashgar.png' });
    await clickBtn('✕');
  } else ok('③点击喀什出详情', false, '未找到站点');

  // ④ 跑步页：GPS拒权提示
  await clickBtn('跑步');
  await new Promise(r => setTimeout(r, 400));
  await clickBtn('开始跑步'); // 默认GPS模式，无头环境定位会被拒绝
  await new Promise(r => setTimeout(r, 2500));
  let runTxt = await text();
  ok('④GPS拒权/失败有明示', runTxt.includes('GPS 信号弱') || runTxt.includes('模拟模式') || runTxt.includes('定位'), runTxt.slice(0, 60).replace(/\n/g, '|'));
  // 切演示模式跑3秒
  await clickBtn('结束');
  await new Promise(r => setTimeout(r, 400));
  await clickBtn('返回');
  await new Promise(r => setTimeout(r, 300));
  await clickBtn('室内/演示');
  await clickBtn('开始跑步');
  await new Promise(r => setTimeout(r, 3200));
  runTxt = await text();
  const distMatch = runTxt.match(/(\d+\.\d+)\s*\n?公里/);
  ok('④演示模式产生距离', distMatch && parseFloat(distMatch[1]) > 0, distMatch?.[1]);
  await clickBtn('暂停');
  await new Promise(r => setTimeout(r, 400));
  ok('④暂停生效', (await text()).includes('已暂停'));
  await clickBtn('继续');
  await new Promise(r => setTimeout(r, 1000));
  await clickBtn('结束');
  await new Promise(r => setTimeout(r, 500));
  ok('④跑后总结', (await text()).includes('本次跑步完成'));
  await clickBtn('返回');
  await new Promise(r => setTimeout(r, 300));
  // 手动补录 5.2km/30min
  await clickBtn('手动补录');
  await new Promise(r => setTimeout(r, 400));
  const minputs = await page.$$('input');
  await minputs[1].type('5.2');
  await minputs[2].type('30');
  await clickBtn('保存');
  await new Promise(r => setTimeout(r, 500));
  await clickBtn('返回');
  await new Promise(r => setTimeout(r, 300));

  // 回首页核对联动
  await clickBtn('中国地图');
  await new Promise(r => setTimeout(r, 600));
  t = await text();
  ok('④补录后累计联动', /5\.[2-9]/.test(t), t.match(/累计（本机）\s*\n?([\d.]+)/)?.[1]);
  ok('④动态区出现记录', t.includes('5.20 km') || t.includes('5.2'));
  await page.screenshot({ path: '/tmp/a_home_after.png' });

  // ⑤ 排行榜
  await clickBtn('排行榜');
  await new Promise(r => setTimeout(r, 500));
  t = await text();
  ok('⑤排行未启用提示', t.includes('多人排行榜尚未启用'));
  ok('⑤无伪造同学', !t.includes('老戈') && !t.includes('大漠飞鹰'));
  ok('⑤本人卡片数值', t.includes('本月里程') && /5\.\d/.test(t));
  await page.screenshot({ path: '/tmp/a_rank.png' });

  // ⑥ 我的
  await clickBtn('我的');
  await new Promise(r => setTimeout(r, 500));
  t = await text();
  ok('⑥四项统计', t.includes('累计跑量') && t.includes('运动次数') && t.includes('平均配速') && t.includes('环线贡献'));
  ok('⑥DRAFT标识', t.includes('DRAFT'));
  await clickBtn('路线校验报告');
  await new Promise(r => setTimeout(r, 500));
  t = await text();
  ok('⑥校验报告内容', t.includes('路线来源') && t.includes('未核验项'));
  await page.screenshot({ path: '/tmp/a_report.png' });
  await clickBtn('✕');
  // 改昵称
  await clickBtn('改昵称');
  await new Promise(r => setTimeout(r, 300));
  const nickInput = await page.$('input[maxlength="12"]');
  if (nickInput) { await nickInput.type('验收员'); await clickBtn('保存'); }
  await new Promise(r => setTimeout(r, 400));
  ok('⑥改昵称生效', (await text()).includes('验收员'));

  // ⑥ 持久化：刷新后数据还在
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  t = await text();
  ok('⑥刷新后数据保留', /5\.[2-9]/.test(t) || t.includes('5.20 km'), t.slice(0, 50).replace(/\n/g, '|'));

  console.log(JSON.stringify(R, null, 1));
  const fails = R.filter(x => !x.pass);
  console.log(`\n==== 通过 ${R.length - fails.length}/${R.length} ====`);
  if (fails.length) console.log('失败项:', fails.map(f => f.name).join('；'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); console.log(JSON.stringify(R, null, 1)); process.exit(1); });
