# E23跑起来

北京大学汇丰商学院 EMBA E23班 · 环中国边境线 27,171 公里接力跑步应用。

跑量 **1:1** 同步中国地图（无虚拟放大）。起点/终点：深圳北大汇丰商学院楼下。

## 技术栈

React 19 + TypeScript + Vite + Tailwind CSS · 纯静态 PWA · 数据存本机 localStorage

## 标准命令

```bash
npm install          # 安装依赖（使用 package-lock.json 锁定版本）
npm run dev          # 开发调试（默认 3000 端口）
npm run build        # TypeScript 检查 + 生产构建（输出 dist/）
npm run preview      # 本地预览生产构建
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

## Capacitor Android（由第二阶段执行）

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "E23跑起来" com.e23running.app --web-dir=dist
npm run build && npx cap add android && npx cap sync
cd android && ./gradlew assembleDebug
```

Web 与 APK 必须从**同一 Git Commit** 构建：先 `npm run build` 生成 `dist/`，再 `npx cap sync`。

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
