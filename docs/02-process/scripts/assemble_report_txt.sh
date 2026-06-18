#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
REPORT_DIR="$ROOT_DIR/docs/02-process/document/report-txt"
CHAPTER_DIR="$REPORT_DIR/chapters"
OUT_FILE="$REPORT_DIR/00-report-master.txt"

if [ ! -d "$CHAPTER_DIR" ]; then
  echo "Missing chapter directory: $CHAPTER_DIR" >&2
  exit 1
fi

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

for chapter in "$CHAPTER_DIR"/*.txt; do
  [ -f "$chapter" ] || continue
  sed -e '$a\' "$chapter" >> "$tmp_file"
done

mv "$tmp_file" "$OUT_FILE"
echo "Assembled $OUT_FILE"

