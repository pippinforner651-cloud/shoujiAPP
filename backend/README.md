# E23跑起来 · 后端（第三阶段）

Node.js + TypeScript + Fastify 5 + PostgreSQL + Prisma 5.22 + Zod + JWT。

## 快速开始

```bash
npm ci
npx prisma generate
# 方式A：Docker 一键（含数据库）
cp .env.example .env   # 修改 JWT_SECRET
docker compose up -d --build
npm run seed
# 方式B：本机 PostgreSQL
export DATABASE_URL=postgresql://user:pass@localhost:5432/e23
npx prisma db push
npm run seed
npm run dev            # :8787
```

## 测试

```bash
npm test   # vitest + embedded-postgres(PG17) 真实数据库，28 项集成测试
```

无需本机安装 PostgreSQL：测试自动拉起内嵌 PG 17 实例（端口 55442，非持久）。

## 目录

```
prisma/schema.prisma   8 张表：users/invite_codes/activities/activity_track_points/
                       manual_activity_evidence/route_versions/route_progress/audit_logs
prisma/seed.ts         路线版本(27171km DRAFT) + 管理员 + 初始邀请码（无伪造运动数据）
src/config.ts          服务配置 + 校验规则（全部环境变量可覆盖）
src/services/validation.ts  服务端运动校验引擎（valid/pending/rejected 三态）
src/services/progress.ts    汇总重算（route_progress 唯一事实源）
src/routes/            auth / activities / class / admin
tests/api.test.ts      28 项集成测试（真实 PG）
```

## 关键设计

- **幂等**：`@@unique(userId, clientId)`，重复上传返回 `duplicated:true`，不重复计里程。
- **三态校验**：手动补录一律 pending 待审；超人类极限 rejected；可疑轨迹 pending。
- **唯一事实源**：任何活动增删改后立即按「仅 valid + 仅 approved 成员」重算 route_progress。
- **CLASS 哨兵**：班级汇总行 userId='CLASS'（规避 PG 唯一索引 NULL 不互斥）。
- **审计**：10 类事件写入 audit_logs。
- **pending 成员**：可登录只读，贡献接口 403 NOT_APPROVED。

详见 `../deploy/` 下四份文档。
