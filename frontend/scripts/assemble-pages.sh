#!/usr/bin/env bash
# Assembles the GitHub Pages site in frontend/dist exactly as it is deployed:
# React build at the root, a 404 copy for deep links, the legacy copy at /legacy/ and the data files.
# Usage (from frontend/, after `npm run build`): bash scripts/assemble-pages.sh ../legacy-src
# Used by both the PR checks and the deploy, so the artifact safety scan sees the real site.
set -euo pipefail
legacy="${1:?path to the legacy site checkout}"
cp dist/index.html dist/404.html
mkdir -p dist/legacy
cp -R "$legacy/index.html" "$legacy/styles.css" "$legacy/og.png" \
  "$legacy/assets" "$legacy/videos.json" "$legacy/live-monitor-state.json" \
  dist/legacy/
cp "$legacy/videos.json" "$legacy/og.png" dist/
echo "legacy source: $(git -C "$legacy" rev-parse HEAD)"
