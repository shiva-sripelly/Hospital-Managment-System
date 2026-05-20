#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/hms/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILENAME="hms-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

docker compose -f docker-compose.prod.yml exec -T db pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

find "$BACKUP_DIR" -type f -name "hms-*.sql.gz" -mtime +14 -delete

echo "Backup written to ${BACKUP_DIR}/${FILENAME}"
