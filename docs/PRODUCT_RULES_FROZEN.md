# E23跑起来 · 产品规则冻结清单

> 以下规则一经冻结，非经产品负责人书面确认不得修改。

| 规则 | 说明 | 是否冻结 |
|---|---|---|
| E23 V2 路线目标 | 约27,000km | ✅ 冻结 |
| 个人贡献公里 ≠ 路线推进公里 | 两者必须分字段独立展示 | ✅ 冻结 |
| Supabase 作为团队事实源 | 禁止 localStorage 作为团队统计依据 | ✅ 冻结 |
| localStorage 仅作为缓存 | 个人偏好/会话可存，团队数据不可依赖 | ✅ 冻结 |
| 假多人禁止 | 不得生成虚假排行榜/班级进度/动态 | ✅ 冻结 |
| RLS 用户隔离 | 用户只能读写自己的活动数据 | ✅ 冻结 |

## 字段展示规则

```
个人贡献公里 = SUM(user.run_activities WHERE status='valid')
路线推进公里 = SUM(class.run_activities WHERE status='valid' AND class_id = current)
```

- 两个字段独立展示，不得混淆
- 前端禁止用 localStorage 数据计算团队公里
- 团队公里必须由 Supabase class_stats / route_progress 提供

## 例外

- 本地开发/离线模式：可用 localStorage + SQLite 模拟
- 但 UI 上必须标注「离线预览」标识
- 不得将离线数据显示为正式团队数据
