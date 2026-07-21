#!/usr/bin/env bash
# E23 后端一键部署（在已装 Docker 的云服务器上执行）
# 前提：已按 deploy/环境变量清单.md 填好 backend/.env
set -euo pipefail
cd "$(dirname "$0")/../backend"

echo "[1/5] 构建镜像"
docker compose build

echo "[2/5] 启动 PostgreSQL + 后端"
docker compose up -d

echo "[3/5] 数据库迁移"
docker compose exec -T backend npx prisma migrate deploy || docker compose exec -T backend npx prisma db push --skip-generate

echo "[4/5] 种子数据（幂等：已存在则跳过）"
docker compose exec -T backend npm run seed || true

echo "[5/5] 健康检查"
sleep 3
docker compose exec -T backend wget -qO- http://127.0.0.1:8787/api/health

echo ""
echo "完成。如需 HTTPS 独立域名：配置 DNS 后执行 docker compose --profile https up -d"
