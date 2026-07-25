# 08_TEST_MATRIX.md
## E23跑起来 · 测试矩阵

## 自动化测试

| 类别 | 命令 | 数量 | 状态 |
|------|------|------|------|
| TypeScript | `npx tsc -b` | — | ✅ |
| Lint | `npm run lint` | — | ✅ |
| 前端 Unit | `npm run test:unit` | 3 文件 | ✅ |
| Vitest | `npx vitest run` | 2 文件 | ✅ |
| Android Unit | `./gradlew testDebugUnitTest` | 3 文件 | ✅ |
| E2E | — | — | ❌ 无 |

**最新测试结果**: 169 passed, 1 skipped (2026-07-23)

## 真机验收矩阵

| 测试 | 平台 | 状态 | 备注 |
|------|------|------|------|
| 持续 GPS 20s | Android | ⬜ | HUAWEI JSC-AL50 待验收 |
| 户外跑首点 | Android | ⬜ | 待持续GPS通过 |
| 步行 200m | Android | ⬜ | |
| 暂停/继续 | Android | ⬜ | |
| 结束保存 | Android | ⬜ | |
| 再次开始 | Android | ⬜ | |
| 锁屏定位 | Android | ⬜ | |
| 后台切换 | Android | ⬜ | |
| 安装 APK | Android | ✅ | Run #9 成功 |
| PWA 页面 | Web | ✅ | 本地可访问 |

## Phase 2 新增测试

| 类别 | 预计数量 |
|------|---------|
| Supabase 连接 | 5 |
| Auth 流程 | 8 |
| 数据同步 | 10 |
| 离线队列 | 5 |
| RLS 权限 | 6 |
| 迁移脚本 | 4 |
| 跨设备 | 4 |
