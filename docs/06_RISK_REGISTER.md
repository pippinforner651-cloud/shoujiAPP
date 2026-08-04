# E23跑起来 · 风险清单

## 风险等级说明
- 🔴 高：当前阻塞，需要立即处理
- 🟡 中：功能受限，近期需处理
- 🟢 低：未来迭代优化

## 风险清单

| # | 风险 | 影响 | 等级 | 解决方案 |
|---|---|---|---|---|
| 1 | **Supabase RLS阻挡用户操作** | 新用户无法加入班级、无法写入活动、无法创建云端记录 | 🔴 | 创建SECURITY DEFINER函数或使用service_role key修正RLS |
| 2 | **Supabase Trigger阻止活动INSERT** | class_stats trigger要求class_id非空，但用户profile中无class_id | 🔴 | 先修正RLS使class_id可更新，或修改Trigger兼容null |
| 3 | **localStorage仍为双数据源** | 部分流程仍依赖localStorage，云端不可用时功能不一致 | 🟡 | 逐步将read路径改为“云端优先，本地缓存”模式 |
| 4 | **Realtime未真实验收** | 多人实时同步无法确认是否工作 | 🟡 | 部署后可进行双浏览器测试 |
| 5 | **sync_queue未完整闭环** | 离线队列有结构，但上传/重试/冲突处理未完整实现 | 🟡 | 实现完整sync_queue循环 + 状态机 |
| 6 | **路线版本需要统一** | DB中classes.total_route_km=21423，前端目标=27000 | 🟡 | 已更新DB中的路线总里程为27000；21423仅作V1历史 |
| 7 | **1:1 与 1:10 换算口径并存** | 历史 migration 003/004/005/006 使用 1:10（total_m/10000），与 V2 正式 1:1 规则冲突，路线推进/完成率失真 | 🔴 | **已由 Migration 007 纠偏为 1:1**（completed_km = total_m/1000.0）；执行 007 并全量回算后，1:10 仅存在于历史 migration 文件注释中 |
| 7 | **Android GPS真机验收未通过** | 锁屏GPS、首点获取尚未在真机上通过 | 🟡 | 使用GPS测试中心逐层诊断 |
| 8 | **OSM地图在中国大陆可能受限** | 部分网络无法加载OSM瓦片 | 🟡 | 预留高德地图适配层 |
| 9 | **PWA未部署公网** | 无法进行真实多人测试 | 🟡 | Vercel/CloudBase部署 |
| 10 | **游客旧数据迁移策略** | 已存在的本地SQLite数据(localStorage)需迁移到云端 | 🟢 | SQLite migration已实现（user_id绑定） |
| 11 | **iPhone Safari测试** | PWA在iOS上的表现未验证 | 🟢 | 正式发布前需测试 |
| 12 | **100人规模扩展性** | 轨迹点/活动数据在100人持续使用下的存储和查询性能 | 🟢 | 当前Supabase免费版足够初期使用 |

## 风险趋势

```
Phase 1         Phase 2.1        Phase 2.2        Release
│               │                │                │
🔴GPS不稳定    🔴RLS阻挡       🟡Realtime       🟢PWA部署
                🔴Trigger       🟡SyncQueue      🟢iOS测试
                🟡localStorage   🟢路线版本统一
```
