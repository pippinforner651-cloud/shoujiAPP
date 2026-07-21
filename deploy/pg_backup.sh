#!/usr/bin/env bash
# E23 PostgreSQL 备份脚本（建议 cron 每日执行：0 3 * * * /path/pg_backup.sh）
# 产物：/backups/e23-YYYYMMDD-HHMMSS.sql.gz，保留最近 14 份
set -euo pipefail
BACKUP_DIR="${BACKUP_DIR:-/backups}"
KEEP="${KEEP:-14}"
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
docker compose -f "$(dirname "$0")/../backend/docker-compose.yml" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-e23}" "${POSTGRES_DB:-e23}" | gzip > "$BACKUP_DIR/e23-$TS.sql.gz"
ls -1t "$BACKUP_DIR"/e23-*.sql.gz | tail -n +$((KEEP+1)) | xargs -r rm -f
echo "backup done: $BACKUP_DIR/e23-$TS.sql.gz"
# 预留：对象存储异地容灾（STORAGE_* 配置后启用）
# rclone copy "$BACKUP_DIR/e23-$TS.sql.gz" remote:e23-backups/
