# E23跑起来 — Codex 启动入口

> 此文件是接管入口，不替代真实源码、Git 状态或构建日志。

## 1. 项目边界

- 项目根目录：`D:\workbuddy制作文件\全民环游中国虚拟跑步地图_V1`
- 前端与构建入口：`frontend/package.json`
- Git 远程：`git@github.com:pippinforner651-cloud/shoujiAPP.git`
- 固定 Web 测试地址：`https://33764578423842b8a0268b9842908784.app.codebuddy.work`

项目根目录没有 `package.json`。所有 Node 命令必须从 `frontend` 执行。

## 2. 必读顺序

1. 本文件
2. `docs/CODEX接管交接包_20260714.md`
3. `docs/codex_handoff_status.json`
4. `docs/项目文件变更快照_20260714.txt`
5. `frontend/package.json`
6. `data/route_master_v1.json` 与 `data/route_master/changelog.md`
7. `.github/workflows/build-apk.yml`

每次开始工作前重新执行 `git status --short`；交接资料中的提交、工作区与 Actions 信息均可能过期。

## 3. 冻结规则

- 路线主数据：`data/route_master_v1.json`，不得改动。
- 路线：48 个节点，最后节点广州；由 140 km `closure` 段返回深圳；总里程 21,423 km。
- 跑量折算：真实 1 km = 虚拟 10 km，`frontend/src/types/progress.ts` 中 `SCALE_RATIO = 10`，不得改动。
- 不得更换固定 Web 测试地址、清除用户 localStorage 或把模拟验证码描述为真实短信。

## 4. 真实实现状态

- 版本：`1.0.1`；Android 包名：`com.e23running.app`；`versionCode=2`。
- 手机号验证码为固定测试码 `123456`；无真实短信服务。
- 微信登录为 mock；不调用真实微信 SDK。
- 用户存储键为 `vr_china_user_v1`。
- 包名从 `com.chinarun.app` 改为 `com.e23running.app`；旧 Android WebView 私有数据不会自然迁移。
- 当前 Android 图标资源为本地未提交改动，尚未完成 APK 或真机验证。

## 5. 常用验证

```powershell
cd "D:\workbuddy制作文件\全民环游中国虚拟跑步地图_V1\frontend"
npx tsc -b
npm run build
```

Android 构建前应先阅读交接包中的环境诊断结果；不要把构建成功或真机验收写入文档，除非本轮已有对应证据。
