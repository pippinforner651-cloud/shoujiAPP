# 05_HANDOVER.md
## E23跑起来 · 项目交接文档

**最后更新**: 2026-07-25 | **更新者**: Phase 2 架构设计

## 项目定位

E23跑起来是北大汇丰 EMBA E23 班的长期多人健康运动平台，不是单机跑步软件。

## 仓库

- `git@github.com:pippinforner651-cloud/shoujiAPP.git`
- 开发分支: `codex/e23-phase1-gps-map-fix`
- 稳定基线: `codex/e23-v2-baseline` (`d07970d`)
- 当前 HEAD: `7aea3e9`

## 项目目录

| 路径 | 用途 |
|------|------|
| `src/pages/` | 页面组件 |
| `src/run/` | 跑步状态机 |
| `src/providers/` | GPS 提供者 (Android/Web) |
| `src/lib/store.ts` | localStorage 数据层 |
| `src/api/` | API 客户端 (未连接) |
| `src/config.ts` | 运行时配置 |
| `android/` | Android 原生工程 |
| `backend/` | 后端 (Prisma + Express) |
| `docs/` | 文档 |
| `.github/workflows/` | CI/CD |

## 当前功能状态

| 功能 | 状态 | 说明 |
|------|------|------|
| 启动页 | ✅ | E23跑起来品牌 |
| 登录/注册 | ✅ | 测试验证码 123456 |
| 微信模拟登录 | ✅ | 弹窗警告 |
| GPS 测试中心 | ✅ | 3层诊断 |
| 单次 GPS | ✅ | 真机通过 |
| 持续 GPS | 🟡 | 待真机验收 |
| 户外跑正式流程 | ⬜ | 待持续GPS通过 |
| 排行榜 | ✅ | 本机数据 |
| 我的页面 | ✅ | 基础 |
| 底部导航 | ✅ | 已修复遮挡 |
| 云端多人 | ❌ | 未实现 |
| iOS | ❌ | 未实现 |
| PWA 部署 | ⬜ | 本地可用，未公网 |

## 禁止事项

详见 `04_DEVELOPMENT_RULES.md`
