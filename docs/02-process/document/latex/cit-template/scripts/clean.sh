#!/bin/bash
# CIT LaTeX Clean Script
set -e

cd "$(dirname "$0")/.."
echo "==> Invoking Makefile to clean up CIT course report workspace..."
make -C scripts clean
echo "==> Workspace cleaned!"
