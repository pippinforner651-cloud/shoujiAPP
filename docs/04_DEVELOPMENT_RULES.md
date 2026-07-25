# 04_DEVELOPMENT_RULES.md
## E23跑起来 · 开发规则

## 分支策略

```
main               ← 稳定发布 (只允许合并)
codex/e23-v2-baseline ← 产品基线 (不动)
kimi/e23-v2-product   ← Kimi 产品线
codex/e23-phase1-gps-map-fix ← 当前开发
backup/*             ← 灾难备份 (不删除)
```

## 保护分支 (禁止直接 push / 修改)

- `main`
- `codex/e23-v2-baseline`
- `kimi/e23-v2-product`
- `backup/*`

## 编码规则

1. **多人数据**: 未上线后端时 `MULTIPLAYER_ENABLED=false`，不伪造假数据
2. **用户主键**: 必须使用 UUID，禁止用昵称
3. **权限**: 使用 Supabase RLS，不在前端隐藏按钮
4. **网络**: 离线不丢数据，`sync_queue` 自动重传
5. **GPS 数据**: 锁屏后台 GPS 仅 Android/iOS 原生可实现，PWA 不伪造
6. **密钥**: 永不提交到仓库
7. **路线**: 约 **27,000 km**（E23 V2 目标，2026-07-25 冻结）。1:10 比例。V1 21,423 km 保留在 Git 历史中。
8. **品牌**: E23跑起来 / 从戈壁出发，奔向世界 — 禁止擅自变更

## 质量门槛

- TypeScript: 0 errors
- 前端测试: 全部通过
- Android 单元测试: 全部通过
- APK: apksigner verify 通过
- 每次提交必须更新 `05_HANDOVER.md`
- 每个大阶段必须更新 `02_CURRENT_BASELINE.md`
