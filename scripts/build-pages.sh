#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  printf '%s\n' 'Usage: scripts/build-pages.sh <new-output-directory>' >&2
  exit 2
fi

ROOT=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
OUT=$1
case "$OUT" in
  /*) ;;
  *) OUT="$PWD/$OUT" ;;
esac

if [ -e "$OUT" ]; then
  printf '%s\n' "Output path already exists: $OUT" >&2
  exit 2
fi

mkdir -p "$OUT/frontend" "$OUT/data"
for file in app.mjs camp-randall-event.mjs closure-overlay.mjs csv.mjs \
    route-planner.mjs route-stops.mjs route-ui.mjs routing.mjs styles.css; do
  cp "$ROOT/frontend/$file" "$OUT/frontend/$file"
done
cp "$ROOT/data/locations.csv" "$ROOT/data/roads.csv" "$OUT/data/"
sed -e 's|href="styles.css"|href="frontend/styles.css"|' \
    -e 's|src="app.mjs"|src="frontend/app.mjs"|' \
    "$ROOT/frontend/index.html" > "$OUT/index.html"
