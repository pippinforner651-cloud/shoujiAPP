# 与 Codex 现有版本的差异说明

对比基准：CODEX 仓库（pippinforner651-cloud/shoujiAPP）main 分支，提交 2f5f02b 及后续文档修正提交（c6d814e / d81f3b1 / 1027fe1）。

## 技术栈

| 项 | Codex 版 | 本版（kimi/e23-v2-product） |
|---|---|---|
| 框架 | React 19 + TS + Vite + Zustand + ECharts + Capacitor 8 | React 19 + TS + Vite + Tailwind（无 ECharts/Zustand） |
| 主包体积 | ≈1.52 MB（有 chunk 警告） | ≈389 KB（gzip ≈120 KB） |
| 地图实现 | ECharts 地图 | 自绘 SVG（静态版图轮廓 + 路线包，两指缩放/拖动） |
| 数据存储 | Zustand + localStorage（键 vr_china_user_v1） | 轻量 store + localStorage（键 e23_user_v1 / e23_records_v1） |

## 路线

| 项 | Codex 版 | 本版 |
|---|---|---|
| 总里程 | 21,423 km | **27,171 km（≥27,000 达标）** |
| 比例 | 1:10 虚拟放大（SCALE_RATIO=10） | **1:1，无虚拟放大** |
| 节点 | 48 个 | 130 个命名站点 + 46 个边界途经点 |
| 闭环 | 广州→深圳 140km closure 段 | 北大汇丰商学院楼下起终闭环 |
| 几何校验 | 无 | 逐段官方版图点内检测，三轮回测，报告在 docs/ |
| 路线状态 | 视为正式 | **DRAFT（待实测核验）** |

## 功能

| 项 | Codex 版 | 本版 |
|---|---|---|
| 登录 | 手机验证码 mock（123456）+ 失败回退 mock 微信登录 | 测试手机号+测试验证码，**明确标注非真实短信/微信**；正式流程（微信授权→邀请码→审批）仅预留说明 |
| 地图点击 | 无站点详情 | 站点/当前位置详情：所在道路、前往地、距下一城市、名胜古迹、美食 |
| 跑步 | GPS 简单记录 | 前台 GPS（漂移过滤、拒权明示）+ 演示模式 + **手动补录** + 实时/平均配速 |
| 排行榜 | 有（数据真实性未保证） | **多人未上线前显示未启用，零伪造用户** |
| 伪造数据 | — | **全部清除**：无假跑者/假排行/假进度/假动态 |
| PWA | 未完成 | manifest + apple-touch-icon，可添加主屏幕 |
| Android | Capacitor 工程存在，本机构建失败 | 本仓库不含 android/ 工程；README 给出同一 Commit 构建 APK 的标准步骤 |

## 数据兼容

- 本版使用新的 localStorage 键，与 Codex 版旧数据**不互通、不迁移**（旧数据含 1:10 放大口径，混入会污染 1:1 口径）
- Codex 版冻结路线数据未被本版使用或修改
