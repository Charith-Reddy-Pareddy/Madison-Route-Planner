#!/bin/sh
set -eu

ROOT=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

if ! command -v mvn >/dev/null 2>&1; then
  printf '%s\n' 'Maven is required to start the route planner.' >&2
  exit 127
fi

if ! command -v npm >/dev/null 2>&1; then
  printf '%s\n' 'Node.js and npm are required to build the frontend.' >&2
  exit 127
fi

if [ ! -x frontend/node_modules/.bin/vite ]; then
  printf '%s\n' 'Frontend dependencies are missing. Run npm ci --prefix frontend first.' >&2
  exit 1
fi

npm --prefix frontend run build

mvn -q -DskipTests compile
exec java -cp target/classes RouteApiServer "$@"
