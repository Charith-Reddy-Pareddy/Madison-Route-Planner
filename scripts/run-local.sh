#!/bin/sh
set -eu

ROOT=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

if ! command -v mvn >/dev/null 2>&1; then
  printf '%s\n' 'Maven is required to start the route planner.' >&2
  exit 127
fi

mvn -q -DskipTests compile
exec java -cp target/classes RouteApiServer "$@"
