#!/usr/bin/env bash
# Assembles the GitHub Pages site in frontend/dist exactly as it is deployed:
# the React build at the root, a 404 copy for deep links, and the data files kept on main
# (videos.json is refreshed there daily by videos.yml). /legacy/ is only a redirect to the new
# home page (public/legacy/index.html); the old site is no longer published (owner, step 5).
# Usage (from frontend/, after `npm run build`): bash scripts/assemble-pages.sh ../main-data
# Used by both the PR checks and the deploy, so the artifact safety scan sees the real site.
set -euo pipefail
data="${1:?path to the main branch data checkout}"
cp dist/index.html dist/404.html
cp "$data/videos.json" "$data/og.png" dist/
echo "data source (main): $(git -C "$data" rev-parse HEAD)"
