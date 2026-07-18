# E23跑起来

北京大学汇丰商学院 EMBA E23班 · 环中国边境线 27,171 公里接力跑步应用。

跑量 **1:1** 同步中国地图（无虚拟放大）。起点/终点：深圳北大汇丰商学院楼下。

## 技术栈

React 19 + TypeScript + Vite + Tailwind CSS · 纯静态 PWA · 数据存本机 localStorage

## 标准命令

```bash
npm ci               # 严格按 package-lock.json 安装（CI/交付统一用 npm ci，不用 npm install）
npm run dev          # 开发调试（默认 3000 端口）
npm run build        # TypeScript 检查 + 生产构建（输出 dist/）
npm run preview      # 本地预览生产构建
npm run test:mobile  # iPhone 等效环境自动化测试（需本地静态服务）
npm run manifest     # 重新生成 docs/文件清单.md
```

## 运行时配置（环境变量）

在 `.env` 或部署平台中设置 `VITE_*` 变量覆盖 `src/config.ts` 默认值：

| 变量 | 默认 | 说明 |
|---|---|---|
| `VITE_ANNUAL_GOAL_KM` | `270` | 个人年度参考目标（公里） |
| `VITE_MULTIPLAYER_ENABLED` | `false` | 多人后端是否上线（上线前不显示任何班级人数/里程/排行） |
| `VITE_TEST_SMS_CODE` | `123456` | 测试登录验证码（测试用途，非真实短信） |
| `VITE_MAP_PROVIDER` | `static-pack` | 地图服务提供方（预留：高德等） |

**不提交任何密钥、Token、真实服务账号。**

## PWA

`public/manifest.webmanifest` + `apple-touch-icon` 已配置。iPhone Safari：分享 → 添加到主屏幕，全屏运行。

## Capacitor Android

- appId：`com.e23running.app.kimi.preview`（Kimi 预览版专用；**正式包名 `com.e23running.app` 本版不使用，待正式版单独迁移确认**）
- appName：`E23跑起来 Kimi预览版`
- `android/` 工程**已生成并纳入源码包**，无需再执行 `cap:add:android`
- Capacitor 依赖（core/cli/android）已全部锁定在 package-lock.json

```bash
npm ci
npm run apk:debug   # 构建 dist → npx cap sync → gradle assembleDebug（需 Android SDK）
```

Web 与 APK 必须从**同一 Git Commit** 构建：`apk:debug` 脚本已内含 `npm run build && npx cap sync`。

## 部署说明（GitHub 自动化）

**发布分支**：`kimi/e23-v2-product`（禁止 main / codex/e23-v2-baseline）

Windows PowerShell 一键发布（脚本内无任何凭证）：

```powershell
.\scripts\publish-kimi-branch.ps1
```

推送后两个 GitHub Actions 自动运行（同一 Commit）：

1. **APK**：`.github/workflows/kimi-android-preview.yml` → Artifact「E23跑起来_Kimi预览版」（含 APK + SHA256）
2. **PWA**：`.github/workflows/kimi-pwa-pages.yml` → GitHub Pages，地址形如 `https://<用户名>.github.io/shoujiAPP/`（以仓库设置为准，页面内显示 Commit 短 SHA 与「Kimi预览版」）

## 测试

```bash
npm run test:unit    # 24 项单元断言（Node，无浏览器依赖，CI 使用）
npm run test:mobile  # iPhone 等效环境全流程（需本地静态服务 + puppeteer-core）
```

## 数据规则（铁律）

1. 每人有效跑步 1 公里 = 全班路线前进 1 公里（1:1，无比例放大）
2. 多人后端未上线前（`MULTIPLAYER_ENABLED=false`）：不生成假跑者、假排行、假全班进度、假动态；排行榜显示未启用；所有统计仅来自本机真实记录
3. 路线在逐段来源与几何核验完成前保持 **DRAFT**（见 `docs/路线数据来源与校验报告.md`）

## 目录

```
src/config.ts          运行时配置
src/data/route.ts      环中国路线主数据（冻结，DRAFT）
src/data/china_outline.json  中国版图轮廓（静态包，不用OSM在线瓦片）
src/lib/store.ts       本机数据层（用户/跑步记录）
src/lib/integrations.ts 第三方接入预留（微信/悦跑圈/手表/地图包）
src/components/ChinaMap.tsx  地图（两指缩放/拖动）
src/pages/             首页地图 / 跑步 / 排行榜 / 我的 / 登录
docs/                  交付文档
```
