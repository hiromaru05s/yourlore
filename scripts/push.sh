#!/bin/bash
# 🚫 BLOCKED 2026-08-03: 이 로컬 폴더는 GitHub main보다 한참 뒤처진 스테일 트리입니다.
# 여기서 배포하면 프로덕션이 롤백됩니다 (0802, 0803 새벽 두 번 발생).
# 배포는 클라우드 세션에서 main 클론으로만. (Codex 포함 — 절대 실행 금지)
echo "BLOCKED: stale local tree. Deploy from cloud main clone only. See comment in this script."
exit 1

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
# .worktrees = 같은 저장소의 git worktree — 레포 안에 커밋되면 안 됨 (브랜치로 이미 보존)
rsync -a --delete \
  --exclude node_modules --exclude dist --exclude .git --exclude legacy \
  --exclude .worktrees \
  --exclude .secrets --exclude _render.cjs --exclude '*.timestamp-*.mjs' \
  "$ROOT"/ "$WORK"/
cd "$WORK"
git config user.email "${CF_ACCOUNT_EMAIL:-maruru836818@gmail.com}"
git config user.name "hiromaru05s"
git add -A
git commit -qm "$MSG" || { echo "nothing to commit"; exit 0; }
git push -q origin main
echo "✓ pushed: $MSG"