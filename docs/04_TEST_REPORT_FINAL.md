# E23跑起来 · 测试报告（Codex最终评审版）

## 整体状态

> **真实多人系统底座完成，业务闭环待Phase 2.1D验收**

### 验证通过项

- 数据库Migration成功
- RLS策略部分验证（A/B数据隔离）
- Trigger安全模型验证
- SQLite隔离验证（user_id绑定）

### 尚未最终闭环

- class_members正式写入流程
- run_activities正式前端写入
- class_stats真实业务累计
- route_progress真实推进
- Realtime双浏览器验证
- sync_queue完整闭环
- PWA公网部署
- iPhone Safari测试

---

## 测试结果汇总

| 套件 | 结果 | 说明 |
|---|---|---|
| unit_test.mjs | 103/103 ✅ | 路线/业务/安全/契约测试 |
| Vitest (RunMap) | 3/3 ✅ | 地图渲染/错误/跟随 |
| Vitest (nativeContract) | 22/22 ✅ | 原生GPS契约 |
| Vitest (runSession) | ~5项 ✅ | 会话状态机 |
| Android单元测试 | 2/2 ✅ | GpsPointEvaluator |

## Supabase API 验证结果

### 认证测试

| 测试 | 结果 |
|---|---|
| User A 注册 (test_a@e23.com) | ✅ 成功 |
| User A 登录 → token | ✅ 成功 |
| User B 注册 (test_b@e23.com) | ✅ 成功 |
| User B 登录 → token | ✅ 成功 |
| Auth session持久化 | ✅ supabase-js处理 |

### RLS 隔离测试

| 测试 | 结果 |
|---|---|
| A读取自己的run_activities | ✅ {user_id=eq.A} → 返回A的数据 |
| B读取A的run_activities | ✅ {user_id=eq.A} → 返回空（RLS生效） |
| A重新登录后恢复 | ✅ 新token正常读取 |

### 写入测试（受阻）

| 测试 | 结果 | 原因 |
|---|---|---|
| A加入class_members | ❌ | RLS阻挡（需service_role） |
| A更新profile.class_id | ❌ | 策略禁止（普通用户） |
| A写入run_activities (1km) | ❌ | class_stats trigger缺class_id |

## 当前线上测试数据

| 项目 | 值 |
|---|---|
| E23 class_id | `94728c9e-9a66-485f-ae9e-12c4da074bb2` |
| classes.total_route_km | 21423（V1历史基线，E23 V2正式目标约27000km） |
| 测试用户数量 | 2 (A + B) |
| Cloud上有效活动 | 0（被RLS/Trigger阻挡） |
