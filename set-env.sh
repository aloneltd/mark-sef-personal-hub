#!/usr/bin/env bash
# Sets Vercel production env vars for mark-sef-personal-hub so the Drive brick can act
# as Mark himself (user-OAuth mode) instead of the service account, which Google now
# refuses write access to in a normal My Drive folder ("Service Accounts do not have
# storage quota"). Run this ONCE after the one-time Google consent script has written
# $HOME/.sef/google-oauth.env.
#
# This script contains NO secret values — it only reads them from a local file and
# pipes them straight into `vercel env add`, and only ever prints variable NAMES.
# Idempotent: safe to re-run (existing vars are removed before being re-added).
#
# Usage:
#   ./set-env.sh          — uses the default Vercel account config (this project's
#                            .vercel/project.json already links it to that account's
#                            mark-sef-personal-hub project, so no extra linking needed).
#   ./set-env.sh new       — targets the second Vercel account config that already
#                            exists at ~/.vercel-mark2, via `vercel --global-config`.
#                            NOTE: this project is NOT linked under that config. If it
#                            is ever migrated to the new account, run `vercel link`
#                            under that config first — this script does not do that.
set -euo pipefail
cd "$(dirname "$0")"

VERCEL_ARGS=()
if [ "${1:-}" = "new" ]; then
  VERCEL_ARGS=(--global-config "$HOME/.vercel-mark2")
fi

GOOGLE_OAUTH_ENV="$HOME/.sef/google-oauth.env"

set_var() {
  local name="$1" value="$2"
  if [ -z "$value" ]; then
    echo "skip $name (no value found)"
    return
  fi
  vercel "${VERCEL_ARGS[@]}" env rm "$name" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel "${VERCEL_ARGS[@]}" env add "$name" production >/dev/null
  echo "set $name"
}

if [ -f "$GOOGLE_OAUTH_ENV" ]; then
  # shellcheck disable=SC1090
  GOOGLE_CLIENT_ID_VAL=$(grep '^GOOGLE_CLIENT_ID=' "$GOOGLE_OAUTH_ENV" | head -1 | cut -d= -f2-)
  GOOGLE_CLIENT_SECRET_VAL=$(grep '^GOOGLE_CLIENT_SECRET=' "$GOOGLE_OAUTH_ENV" | head -1 | cut -d= -f2-)
  GOOGLE_REFRESH_TOKEN_VAL=$(grep '^GOOGLE_REFRESH_TOKEN=' "$GOOGLE_OAUTH_ENV" | head -1 | cut -d= -f2-)
  set_var GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID_VAL"
  set_var GOOGLE_CLIENT_SECRET "$GOOGLE_CLIENT_SECRET_VAL"
  set_var GOOGLE_REFRESH_TOKEN "$GOOGLE_REFRESH_TOKEN_VAL"
else
  echo "missing $GOOGLE_OAUTH_ENV — run the one-time Google consent script first, then re-run this script"
fi

echo "done — GOOGLE_DRIVE_FOLDER_ID is unchanged (still points at the shared 'SEF Apps Data' parent folder)"
