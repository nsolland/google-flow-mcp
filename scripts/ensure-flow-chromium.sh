#!/usr/bin/env bash
set -euo pipefail
PROFILE="$HOME/.local/share/hermes-integrations/flow-chromium-profile"
if test -z "$DISPLAY" && test -z "$WAYLAND_DISPLAY"; then
  echo "No graphical session available; run from desktop graphical login."
  exit 2
fi
mkdir -p "$PROFILE"
exec /usr/bin/chromium \
  --remote-debugging-port=9327 \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  'https://labs.google/fx/tools/flow'
