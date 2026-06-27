#!/usr/bin/env bash
# Commit the current workspace and push to GitHub, preserving history (clone-based).
# Usage: bash scripts/push.sh "commit message"
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/.secrets/credentials.env"
MSG="${1:-update}"

WORK="/tmp/lore-gh"
rm -rf "$WORK"
git clone -q "https://x-access-token:${GITHUB_TOKEN}@${GITHUB_REPO}.git" "$WORK"
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
