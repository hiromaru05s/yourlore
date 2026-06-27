#!/usr/bin/env bash
# Build the client and deploy the single Cloudflare Worker (serves client + /api + /ws).
# Runs from a non-mounted copy because the mounted workspace FS blocks file unlink,
# which breaks vite's dist cleanup and wrangler's temp handling.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/.secrets/credentials.env"

WORK="/tmp/lore-deploy"
rm -rf "$WORK"; mkdir -p "$WORK"
rsync -a --exclude node_modules --exclude dist --exclude .git \
  --exclude legacy --exclude .secrets "$ROOT"/ "$WORK"/

cd "$WORK"
npm install --no-audit --no-fund
npm run build
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" npx wrangler deploy -c server/wrangler.toml
echo "✓ deployed → $WORKER_URL"
