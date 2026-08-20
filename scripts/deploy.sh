#!/bin/bash
# 🚫 BLOCKED 2026-08-03: 이 로컬 폴더는 GitHub main보다 한참 뒤처진 스테일 트리입니다.
# 여기서 배포하면 프로덕션이 롤백됩니다 (0802, 0803 새벽 두 번 발생).
# 배포는 클라우드 세션에서 main 클론으로만. (Codex 포함 — 절대 실행 금지)
echo "BLOCKED: stale local tree. Deploy from cloud main clone only. See comment in this script."
exit 1

#!/usr/bin/env bash
# Build the client and deploy the single Cloudflare Worker (serves client + /api + /ws).
# Runs from a non-mounted copy because the mounted workspace FS blocks file unlink,
# which breaks vite's dist cleanup and wrangler's temp handling.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/.secrets/credentials.env"

# fresh dir per run (stale dirs can be owned by another sandbox user and be undeletable)
WORK="$(mktemp -d /tmp/lore-deploy.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
rsync -a --exclude node_modules --exclude dist --exclude .git \
  --exclude legacy --exclude .secrets "$ROOT"/ "$WORK"/

cd "$WORK"
npm install --no-audit --no-fund
npm run build
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" npx wrangler deploy -c server/wrangler.toml
echo "✓ deployed → $WORKER_URL"