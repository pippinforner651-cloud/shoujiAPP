# E23路线包

本目录承载V2及未来路线包，不替代或修改`data/route_master_v1.json`。

路线生命周期：`DRAFT → VERIFIED → PUBLISHED → ARCHIVED`。

- `DRAFT`可以不完整，但不能绑定正式活动；
- `VERIFIED`必须通过结构、27,000公里下限、1:1、校园闭环、路段连续、里程合计和来源校验；
- `PUBLISHED`内容不可原地改写，修订必须创建新版本；
- `ARCHIVED`只供历史活动回放。

运行验证：

```powershell
node data\route_packages\validate-route-package.mjs data\route_packages\e23-china-loop-v2.draft.json
```

当前草稿预期验证失败，因为尚未选择道路路由来源，也没有伪造27,000+公里路段。正式路线需在来源、费用和切换方案获得用户确认后生成与审计。
