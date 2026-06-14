#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
REPORT="$ROOT_DIR/docs/02-process/document/report-txt/00-report-master.txt"
CHECKLIST="$ROOT_DIR/docs/02-process/Figure/screenshot-checklist.txt"

if [ ! -f "$REPORT" ]; then
  echo "Missing report: $REPORT" >&2
  exit 1
fi

if [ ! -f "$CHECKLIST" ]; then
  echo "Missing checklist: $CHECKLIST" >&2
  exit 1
fi

report_list="$(mktemp)"
checklist_list="$(mktemp)"
trap 'rm -f "$report_list" "$checklist_list"' EXIT

grep -o '\[截图占位符: S[0-9][0-9]-[^]]*\]' "$REPORT" | sort -u > "$report_list" || true
grep -o '\[截图占位符: S[0-9][0-9]-[^]]*\]' "$CHECKLIST" | sort -u > "$checklist_list" || true

if ! diff -u "$checklist_list" "$report_list"; then
  echo "Screenshot placeholders differ between report and checklist." >&2
  exit 1
fi

echo "Screenshot placeholders are aligned."

