#!/usr/bin/env bash

set -euo pipefail

SECRET_FILE="./secrets/db_password"
DB_CONTAINER="marketplace-db"
DB_USER="user"
DB_NAME="r_d__marketplace"

NEW_PASSWORD="$(openssl rand -hex 24)"

echo "Rotating database password..."

docker exec "$DB_CONTAINER" \
  psql \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -c "ALTER ROLE \"$DB_USER\" WITH PASSWORD '$NEW_PASSWORD';"

printf '%s' "$NEW_PASSWORD" > "$SECRET_FILE"

echo "Secret file updated."

docker exec "$DB_CONTAINER" \
  psql \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE usename = '$DB_USER'
        AND pid <> pg_backend_pid();"

echo "Old database connections terminated."
echo "Password rotation completed."