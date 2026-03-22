#!/usr/bin/env bash
# Install SVG icons from Simple Icons CDN
# Usage: ./install-icons.sh cloudflare neon duckdb linux steam spotify tidal gmail

if [ $# -eq 0 ]; then
  echo "Usage: ./install-icons.sh <icon1> <icon2> ..."
  echo "       ./install-icons.sh --all"
  exit 1
fi

cd "$(dirname "$0")"

if [ "$1" = "--all" ]; then
  exec bun download-icons.ts
fi

exec bun download-icons.ts "$@"
