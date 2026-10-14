#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  printf '%s\n' 'Usage: scripts/build-pages.sh <output-directory>' >&2
  exit 2
fi

ROOT=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
OUT=$1
case "$OUT" in
  /*) ;;
  *) OUT="$PWD/$OUT" ;;
esac

if [ ! -x "$ROOT/frontend/node_modules/.bin/vite" ]; then
  printf '%s\n' 'Install frontend dependencies first: npm ci --prefix frontend' >&2
  exit 1
fi

npm --prefix "$ROOT/frontend" run build -- --configLoader runner --outDir "$OUT" --emptyOutDir
mkdir -p "$OUT/data"
cp "$ROOT/data/locations.csv" "$ROOT/data/roads.csv" "$OUT/data/"
