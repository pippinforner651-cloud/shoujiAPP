# ROUTE_RULE_AUDIT.md
## E23跑起来 · 路线目标冻结审计

## 正式冻结

| 项 | 值 | 冻结时间 |
|---|-----|---------|
| **E23 V2 正式目标** | **约 27,000 km** | **2026-07-25** |
| 跑量→虚拟公里比例 | 1:10 | 此前已冻结 |
| E23 V1 历史基线 | 21,423 km（48城环游中国） | 保留在 Git 历史 |

## 审计清单

### 已更新（✅）

| 位置 | 状态 | 内容 |
|------|------|------|
| `supabase/migrations/001_create_all_tables.sql` | ✅ | DEFAULT 21423 → 27000；Seed 21423 → 27000 |
| `supabase/migrations/003_team_stats_trigger.sql` | ✅ | COALESCE 后备 21423 → 27000 |
| `supabase/migrations/004_security_audit.sql` | ✅ | 百分比计算 21423.0 → 27000.0 |
| `supabase/migrations/005_bootstrap_transaction.sql` | ✅ | 百分比计算 21423.0 → 27000.0 |
| `supabase/migrations/006_route_target_27000.sql` | ✅ | 新 Migration |
| `docs/00_PROJECT_OVERVIEW.md` | ✅ | 加入路线目标章节 |
| `docs/02_CURRENT_BASELINE.md` | ✅ | 冻结规则更新 |
| `docs/03_DATABASE_SCHEMA.md` | ✅ | DEFAULT 21423 → 27000 |
| `docs/04_DEVELOPMENT_RULES.md` | ✅ | 路线规则更新 |

### 需要 Supabase 执行（待操作）

| 文件 | 说明 |
|------|------|
| `supabase/migrations/006_route_target_27000.sql` | 更新 DB + Trigger + 重新触发统计 |

### 不需修改

| 位置 | 原因 |
|------|------|
| `与Codex版本差异说明.md` | 已记录 27,171km ≈ 27,000，表述一致 |
| `路线数据来源与校验报告.md` | V1 历史路线文档，保留原始值 |
| V1 客户端路线数据文件 | 路线节点数据不包含 total_route_km，不需修改 |

## 注意事项

- **27,000 km 为约数**，精确值由路线节点实际累加总和决定
- V1 21,423 km 凭据（48城路线文件等）保留在 Git 历史，不删除
- 任何将来的路线修改必须更新本审计文件
