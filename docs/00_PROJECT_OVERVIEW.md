# 00_PROJECT_OVERVIEW.md
## E23跑起来 · 项目概述

- **项目名称**: E23跑起来
- **产品定位**: 北大汇丰 EMBA E23 班长期多人健康运动平台
- **品牌口号**: 从戈壁出发，奔向世界 / 一起出发，一直向前
- **技术形态**: Android APK + PWA + 未来 iOS
- **数据架构**: 当前单机 localStorage → 目标 Supabase 云端多人
- **代码仓库**: `pippinforner651-cloud/shoujiAPP`
- **开发分支**: `codex/e23-phase1-gps-map-fix`
- **稳定基线**: `codex/e23-v2-baseline`

## 核心业务

1. 成员跑步记录归属于自己的账号
2. 多人跑步数据共同贡献 E23 团队路线
3. 排行榜、团队总里程、路线位置、城市解锁跨设备共享
4. Android / iPhone / PWA 同一云端事实源

## 路线目标

- **E23 V2 正式目标**: 约 **27,000 km**（2026-07-25 冻结）
- E23 V1 历史基线: 21,423 km（48城环游中国路线，保留在 Git 历史）
- 跑量→虚拟公里比例: **1:10**（冻结规则）
- 从本指令起，所有代码、数据库、文档、UI 统一按约 27,000 km 设计

## 当前阶段

- `Phase 1.6.1`: GPS 持续定位诊断修复 ✅ (APK 已构建)
- `Phase 2`: Cloud Multiplayer + iPhone/PWA + Handover Foundation (当前)
