#!/usr/bin/env bash
# Commit the current workspace and push to GitHub, preserving history (clone-based).
# Usage: bash scripts/push.sh "commit message"
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/.secrets/credentials.env"
MSG="${1:-update}"

# fresh dir per run (stale dirs can be owned by another sandbox user and be undeletable)
WORK="$(mktemp -d /tmp/lore-gh.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
rmdir "$WORK" # git clone wants a fresh path
# blobless partial clone — 카드 아트(수백 webp)가 히스토리에 쌓여 풀 클론이 타임아웃 나므로
# 블롭은 필요할 때만 lazy-fetch (push는 정상 동작)
git clone -q --filter=blob:none "https://x-access-token:${GITHUB_TOKEN}@${GITHUB_REPO}.git" "$WORK"
rsync -a --delete \
  --exclude node_modules --exclude dist --exclude .git --exclude legacy \
  --exclude .secrets --exclude _render.cjs --exclude '*.timestamp-*.mjs' \
  "$ROOT"/ "$WORK"/
cd "$WORK"
git config user.email "${CF_ACCOUNT_EMAIL:-maruru836818@gmail.com}"
git config user.name "hiromaru05s"
git add -A
git commit -qm "$MSG" || { echo "nothing to commit"; exit 0; }
git push -q origin main
echo "✓ pushed: $MSG"
