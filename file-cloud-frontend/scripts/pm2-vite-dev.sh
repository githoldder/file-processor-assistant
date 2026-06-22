#!/bin/zsh
set -e
cd "$(dirname "$0")/.."
exec /opt/homebrew/bin/npm run dev
