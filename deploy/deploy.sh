#!/usr/bin/env bash
#
# Build and deploy MentesIT / FreeIT to the self-hosted nginx server.
#
# Usage:
#   ./deploy/deploy.sh user@host:/var/www/mentesit/public/
#   DEPLOY_DEST=user@host:/var/www/mentesit/public/ ./deploy/deploy.sh
#
set -euo pipefail

DEST="${1:-${DEPLOY_DEST:-}}"
if [[ -z "$DEST" ]]; then
  echo "Usage: $0 user@host:/path/to/public/" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Building (production)…"
HUGO_ENV=production hugo --gc --minify --cleanDestinationDir

# Safety net: never sync an empty build with --delete.
if [[ ! -f public/index.html ]] || [[ -z "$(ls -A public 2>/dev/null)" ]]; then
  echo "ERROR: build output is missing or empty — aborting deploy." >&2
  exit 1
fi

echo "==> Deploying to ${DEST}…"
rsync -azh --delete --checksum --human-readable \
  --exclude '.well-known/acme-challenge/' \
  public/ "$DEST"

echo "==> Done."
