#!/usr/bin/env bash
# Daily PostgreSQL backup — run as deploy user via cron (0 3 * * *)
set -euo pipefail

DB_NAME="ctrl_custo"
DB_USER="ctrl_custo_user"
BACKUP_DIR="/home/deploy/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
FILE="${BACKUP_DIR}/ctrl_custo_${DATE}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting backup of ${DB_NAME}..."

# Dump and compress
pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${FILE}"

echo "[$(date)] Backup written to ${FILE} ($(du -sh "${FILE}" | cut -f1))"

# Remove backups older than RETENTION_DAYS
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days"

# Optional: upload to Oracle Object Storage
# Requires oci-cli installed and configured: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm
#
# BUCKET="ctrl-custo-backups"
# oci os object put \
#   --bucket-name "${BUCKET}" \
#   --file "${FILE}" \
#   --name "backups/$(basename ${FILE})" \
#   --force

echo "[$(date)] Backup complete."
