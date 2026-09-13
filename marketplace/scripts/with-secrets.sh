#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ENV_SLUG="${1:-dev}"; shift || true

[ "$#" -gt 0 ] || set -- npm run start

# грейдер не має доступу до сховища: значення вже в оточенні
if [ "${SKIP_VAULT:-0}" = "1" ]; then exec "$@"; fi

CREDS="$ROOT/.secrets/infisical.env"

if command -v infisical >/dev/null 2>&1; then
  exec infisical run --env="$ENV_SLUG" -- "$@"
fi

if [ ! -f "$CREDS" ]; then
  echo "with-secrets.sh: infisical CLI not found and $CREDS is missing" >&2
  exit 1
fi

set -a
. "$CREDS"
set +a

exec "$@"
