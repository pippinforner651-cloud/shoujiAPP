# 06_BRANCH_STRATEGY.md
## E23跑起来 · 分支策略

## 分支总览

```
main ────────────────────────────── 稳定发布
  │
  ├── codex/e23-v2-baseline ─────── 产品基线 (只读)
  │
  ├── kimi/e23-v2-product ───────── Kimi 产品线
  │
  └── codex/e23-phase1-gps-map-fix ─ 当前开发
         │
         ├── backup/phase-1.6.1b-wrong-8c234af ── 错误版本备份
         └── (后续 Phase 2.x 开发分支)
```

## 操作规则

| 操作 | 分支 | 允许 |
|------|------|------|
| 直接 push | `codex/e23-phase1-gps-map-fix` | ✅ |
| 直接 push | `main` | ❌ |
| 直接 push | `codex/e23-v2-baseline` | ❌ |
| 直接 push | `kimi/e23-v2-product` | ❌ |
| 删除 | `backup/*` | ❌ |
| force push | 任何分支 | ❌ |
| 创建 PR | 到 main | ⬜ (待用户确认) |

## 开发流程

1. 在 `codex/e23-phase1-gps-map-fix` 开发
2. 稳定后由用户确认合并到 `main`
3. 每条分支独立触发 GitHub Actions
