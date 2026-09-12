#!/usr/bin/env bash
# web/publish_posts.sh — 데일리 포스트를 공개 웹에 발행한다.
#
# 블로그 원고는 사용자가 직접 손본 뒤 공개하므로 daily.sh 가 자동으로 올리지
# 않는다. 원고 수정이 끝난 뒤 이 스크립트를 실행한다.
#
#   bash web/publish_posts.sh              # 최신 한 편 발행
#   bash web/publish_posts.sh --all        # 전체 재생성 (템플릿·스타일을 바꿨을 때)
#
# 멱등적이다 — 바뀐 게 없으면 "no changes" 로 무해하게 끝난다.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="--latest"
[ "${1:-}" = "--all" ] && MODE=""

python script_web/build_posts.py $MODE

if [ ! -d web/.git ]; then
  echo "[skip] web/.git 없음 — 커밋/푸시 건너뜀"
  exit 0
fi

git -C web add posts assets/img/posts sitemap.xml 2>/dev/null || true

if git -C web diff --cached --quiet 2>/dev/null; then
  echo "[web] 발행할 변경 없음"
  exit 0
fi

LATEST="$(ls -1 web/posts/*.html 2>/dev/null | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | sort | tail -1)"
git -C web commit -q -m "Publish daily report ${LATEST}"
if git -C web push -q; then
  echo "[web] 발행 완료 (${LATEST}) -> Vercel auto-deploy"
else
  echo "[warn] web push 실패 — 커밋은 로컬에 남음 (복구: git -C web push)"
fi
