#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: ./deploy/scripts/restore_postgres.sh /path/to/backup.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

gunzip -c "$BACKUP_FILE" | docker compose -f docker-compose.prod.yml exec -T db psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB"
